"use server";
import {moneyPercent,moneyCents} from '@/lib/money';

import { getExchangeSnapshot } from '@/lib/monetary';
import { exchangeRateLabel } from '@/lib/exchange-rate';
import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/catalog-data";
import { scheduleTransactionalEmails } from "@/lib/email-worker";
import { limitCommerceRequest } from "@/lib/request-limit";
import { createHash } from "node:crypto";
import { createCommerceService } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateShipping, isShippingPaidSeparately } from "@/lib/shipping";
import { priceOrder, type PricedItem } from "@/lib/order-pricing";
import { createMercadoPagoPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getPublicWholesalePolicy, getPublicWholesaleOffers } from '@/lib/wholesale-v2-read';
import { validateWholesaleOrder } from '@/lib/wholesale-policy';
import { refreshCheckoutSupplierCatalog } from '@/lib/supplier-tracker/checkout';
interface WholesaleBasis {status:string;reason:string;unit_price:number|null;policy_id:string|null;cost_basis?:unknown}
export async function loadWholesaleCartAction(items:Array<{productId:string;variantId?:string|null;quantity?:number}>){
 try{return{ok:true as const,policy:await getPublicWholesalePolicy(),offers:await getPublicWholesaleOffers(items)};}
 catch{return{ok:false as const,error:'No se pudieron verificar los precios mayoristas. El pedido requiere confirmación.'};}
}
export interface CheckoutInput {
  lines: { productId: string; variantId?: string; quantity: number; channel: "retail" | "wholesale" }[];
  paymentMethod: "transferencia" | "mercado_pago";
  postalCode: string;
  province?: string;
  city?: string;
  address?: string;
  shippingOptionId: string;
  coupon: string;
}
export interface OrderInput extends CheckoutInput {
  name: string; email: string; phone: string; address: string; city: string; notes: string;
  province?: string;
  requestId: string; expectedTotal: number; quoteId?: string;
  acceptSeparateShipping: boolean;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveQuote(input: CheckoutInput) {
  if (process.env.COMMERCE_CHECKOUT_ENABLED !== "true") throw new Error("Las compras online están en preparación. Consultanos para comprar.");
  if (!input || !Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) throw new Error("El carrito no es válido.");
  if (!["transferencia", "mercado_pago"].includes(input.paymentMethod)) throw new Error("Medio de pago inválido.");
  if (input.paymentMethod === "mercado_pago" && !isMercadoPagoConfigured()) throw new Error("Mercado Pago no está disponible. Elegí transferencia.");
  if (typeof input.postalCode !== "string" || input.postalCode.length > 12 || typeof input.coupon !== "string" || input.coupon.length > 30) throw new Error("Revisá código postal y cupón.");
  const lineKeys = new Set<string>();
  const productIds = new Set<string>();
  const variantIds = new Set<string>();
  for (const line of input.lines) {
    if (!uuid.test(line.productId) || (line.variantId && !uuid.test(line.variantId)) || !(["retail","wholesale"].includes(line.channel)) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) {
      throw new Error("Revisá productos, canales y cantidades.");
    }
    const lineKey = line.variantId ? `${line.productId}:${line.variantId}` : line.productId;
    if (lineKeys.has(lineKey)) {
      throw new Error("No podés incluir líneas duplicadas en el pedido.");
    }
    lineKeys.add(lineKey);
    productIds.add(line.productId);
    if (line.variantId) variantIds.add(line.variantId);
  }
  const db = createCommerceService();
  await refreshCheckoutSupplierCatalog(db,input.lines);
  const exchange = await getExchangeSnapshot();
  const { data: products, error } = await db.from("products").select(`${PUBLIC_PRODUCT_COLUMNS}, categories(name, slug)`).in("id", [...productIds]).is("deleted_at", null);
  if (error || products?.length !== productIds.size) throw new Error("No pudimos verificar los productos. Intentá nuevamente.");
  let dbVariants: { id: string; product_id: string; title: string; retail_price: number; stock: number; stock_verified_at: string | null; fulfillment_mode: string; supplier_available: boolean; is_active: boolean; commercial_status?: string | null }[] = [];
  if (variantIds.size > 0) {
    const { data: variants, error: varError } = await db.from("product_variants").select("id, product_id, title, retail_price, stock, stock_verified_at, fulfillment_mode, supplier_available, is_active, commercial_status").in("id", [...variantIds]);
    if (varError || variants?.length !== variantIds.size) throw new Error("No pudimos verificar las variantes seleccionadas. Intentá nuevamente.");
    dbVariants = variants;
  }
  const priced = await db.rpc('store_checkout_prices_v1',{items_input:input.lines,payment_input:input.paymentMethod,rate_input:exchange?.status==='valid'?exchange.id:null});
  if(priced.error)throw new Error('Necesitamos una cotización vigente, costos y disponibilidad confirmados antes de cobrar. Actualizá el resumen o consultanos.');
  const monetaryPrices=priced.data as Array<{productId:string;variantId:string|null;price:number|null;basis:WholesaleBasis|null;revision:number|null;usd:string|null}>;
  const wholesaleLines=input.lines.filter(l=>l.channel==='wholesale');
  if(wholesaleLines.length){
    const reasons:string[]=[];
    for(const line of wholesaleLines){
      const p=products.find(p=>p.id===line.productId)!;
      const v=line.variantId?dbVariants.find(v=>v.id===line.variantId&&v.product_id===p.id):null;
      if(!p.is_active || (p as unknown as { commercial_status?: string }).commercial_status !== 'AVAILABLE' || (line.variantId && !v) || (v && (!v.is_active || v.commercial_status !== 'AVAILABLE')) || (p.has_variants && !line.variantId)) throw new Error('Revisá el producto y la variante exacta.');
      const basis=monetaryPrices.find(r=>r.productId===p.id&&(r.variantId??null)===(line.variantId??null))?.basis;
      if(!basis)throw Error('No se pudo verificar la cotización mayorista.');
      if(basis.status!=='ready'||!(Number(basis.unit_price)>0))reasons.push(`${p.title}: requiere confirmar costos y disponibilidad.`);
    }
    if(reasons.length)return{kind:'confirmation' as const,db,reasons};
  }
  const { data: costs, error: costError } = await db.from("product_costs").select("*").in("product_id", [...productIds]);
  if (costError) throw new Error("No pudimos verificar los precios. Consultanos para continuar.");
  const items: PricedItem[] = input.lines.map(line => {
    const p = products.find(p => p.id === line.productId)!;
    const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
    if (!p.is_active || (p as unknown as { commercial_status?: string }).commercial_status !== "AVAILABLE" || (line.channel === "retail" && p.is_wholesale_only)) throw new Error(`Consultá disponibilidad de ${p.title} antes de comprar.`);
    if (Array.isArray(p.payment_methods) && p.payment_methods.length > 0 && !p.payment_methods.includes(input.paymentMethod)) {
      throw new Error(`${p.title} no acepta ${input.paymentMethod === "mercado_pago" ? "Mercado Pago" : "transferencia bancaria"}. Elegí otro medio de pago.`);
    }

    let price = Number(p.retail_price);
    let title = p.title;

    if (line.variantId) {
      const v = dbVariants.find(v => v.id === line.variantId);
      if (!v || v.product_id !== p.id || !v.is_active || (v.commercial_status && v.commercial_status !== "AVAILABLE")) {
        throw new Error(`La opción seleccionada de ${p.title} no está disponible.`);
      }
      if (v.fulfillment_mode === "supplier" ? !v.supplier_available : (!v.stock_verified_at || v.stock < line.quantity)) {
        throw new Error(`Consultá disponibilidad de ${p.title} (${v.title}) antes de comprar.`);
      }
      price = Number(v.retail_price);
      title = `${p.title} (${v.title})`;
    } else {
      if (p.has_variants) {
        throw new Error(`Por favor seleccioná una opción para ${p.title}.`);
      }
      if (p.fulfillment_mode === "supplier" ? !p.supplier_available : (!p.stock_verified_at || p.stock < line.quantity)) {
        throw new Error(`Consultá disponibilidad de ${p.title} antes de comprar.`);
      }
    }

    price=Number(monetaryPrices.find(r=>r.productId===p.id&&(r.variantId??null)===(line.variantId??null))?.price);
    if(!Number.isFinite(price)||price<=0)throw new Error('Precio pendiente de confirmación.');
    const cost = costs?.find(c => c.product_id === p.id);
    const fresh = cost?.expenses_confirmed && cost?.verified_at && Date.now() - Date.parse(cost.verified_at) < 30 * 86400000;
    // Charge the published server price. Unknown costs disable discounts, not the purchase.
    return {
      id: p.id,
      channel: line.channel,
      variant_id: line.variantId || null,
      title,
      quantity: line.quantity,
      price,
      landedCost: fresh ? Number(cost.landed_cost) : null,
      variableCost: fresh ? (moneyCents(Number(cost.variable_cost ?? 0))+moneyCents(moneyPercent(price,Number(cost.payment_fee_percent ?? 0))))/100 : 0,
      minimumContribution: fresh ? Number(cost.minimum_contribution ?? 0) : 0,
      beauty: /cosm|capilar|crema|serum|tonic|limpieza|shampoo|aceite|mascarilla/i.test(category?.name ?? ""),
    };
  });
  const supplierDelivery = input.lines.some(line => {
    if (line.variantId) {
      const v = dbVariants.find(v => v.id === line.variantId);
      return v?.fulfillment_mode === "supplier";
    }
    const p = products.find(p => p.id === line.productId)!;
    return p.fulfillment_mode === "supplier";
  });
  const ownStockDelivery = input.lines.some(line => {
    if (line.variantId) {
      const v = dbVariants.find(v => v.id === line.variantId);
      return v?.fulfillment_mode !== "supplier";
    }
    const p = products.find(p => p.id === line.productId)!;
    return p.fulfillment_mode !== "supplier";
  });
  if (!isShippingPaidSeparately() && supplierDelivery && ownStockDelivery) throw new Error("Este carrito necesita coordinar entregas desde distintos depósitos. Consultanos para cotizarlo.");
  const shipping = calculateShipping(input.postalCode, 0, !supplierDelivery, supplierDelivery, input.province, input.city, input.address);
  const option = shipping.options.find(o => o.id === input.shippingOptionId);
  const shippingQuotedSeparately = isShippingPaidSeparately() && option?.id === "delivery_quote_separately";
  if (option?.requiresQuote && !shippingQuotedSeparately) throw new Error("Confirmemos la tarifa y el plazo de envío para tu destino antes del pago. Envianos el carrito por WhatsApp.");
  if (!shipping.isValid || !option) throw new Error("Elegí un destino y una opción de entrega válidos.");
  if (option.type !== "pickup" && !shippingQuotedSeparately) {
    if (process.env.COMMERCE_SHIPPING_ENABLED !== "true") throw new Error("El envío necesita confirmación de tarifa. Consultanos por WhatsApp para coordinar la entrega.");
    const weight = input.lines.reduce((sum, line) => {
      const p = products.find(p => p.id === line.productId)!;
      const declared = Number(p.specifications?.peso_kg);
      if (!Number.isFinite(declared) || declared <= 0) throw new Error(`El envío de ${p.title} necesita peso y tarifa confirmados. Consultanos por WhatsApp para coordinarlo.`);
      return sum + declared * line.quantity;
    }, 0);
    if (weight > 25) throw new Error("Este pedido supera los 25 kg (límite estándar de Correo Argentino). Consultanos por WhatsApp para coordinar la entrega.");
  }
  let quote;
  if(wholesaleLines.length){
    const policy=await getPublicWholesalePolicy(db);
    if(!policy.confirmed)throw new Error('No se pudieron confirmar las condiciones mayoristas vigentes. Por favor reintentá o consultanos por WhatsApp.');
    const minimum=validateWholesaleOrder(items.map(i=>({channel:i.channel,quantity:i.quantity,price:i.price})),policy);
    if(!minimum.meetsMinimum)throw new Error(minimum.errorMessage);
    const subtotal=items.reduce((sum,i)=>sum+moneyCents(i.price)*i.quantity,0)/100;
    // Quote already includes the configured payment/risk costs and quantity margin. Do not stack retail promotions.
    quote={subtotal,discount:0,shipping:option.price,total:(moneyCents(subtotal)+moneyCents(option.price))/100,promotion:'Precios mayoristas verificados',couponMessage:input.coupon?'Los precios mayoristas no acumulan cupones minoristas.':''};
  }else quote=priceOrder(items,input.paymentMethod,input.coupon,option.price,input.postalCode);
  return {kind:'order' as const, db, items, quote: { ...quote, shippingQuotedSeparately }, option, monetaryPrices, exchange };
}
function checkoutFingerprint(input:CheckoutInput){
 return createHash('sha256').update(JSON.stringify({lines:input.lines.map(l=>({productId:l.productId,variantId:l.variantId??null,quantity:l.quantity,channel:l.channel})),payment:input.paymentMethod,postal:input.postalCode.trim().toUpperCase(),province:(input.province??'').trim(),city:(input.city??'').trim(),address:(input.address??'').trim(),shipping:input.shippingOptionId,coupon:input.coupon.trim().toUpperCase()})).digest('hex');
}
export async function quoteOrderAction(input: CheckoutInput) {
 try {
  await limitCommerceRequest('quote');const result=await resolveQuote(input);
  if(result.kind==='confirmation')return {ok:true as const,quote:null,confirmationRequired:true as const,reasons:result.reasons};
  const {db,items,quote,option,monetaryPrices,exchange}=result;
  const settings=await db.from('store_money_settings').select('quote_seconds').eq('id',true).single();
  if(settings.error)throw Error('No se pudo verificar la vigencia de compra.');
  const expiresAt=new Date(Math.min(Date.now()+settings.data.quote_seconds*1000,exchange?.status==='valid'&&exchange.expiresAt?Date.parse(exchange.expiresAt):Infinity)).toISOString();
  const payload={payment:input.paymentMethod,items,subtotal:quote.subtotal,discount:quote.discount,shipping:quote.shipping,total:quote.total,shipping_option:option.id,promotion:quote.promotion,discountAllocations:quote.discountAllocations??{}};
  const checked=await db.rpc('store_validate_profitability_v2',{payload_input:payload,rate_input:exchange?.id??null,snapshot_input:null});
  const checkedData = checked.data as { allowed?: boolean; state?: string; reason?: string } | null;
  if(checked.error || checkedData?.allowed === false || checkedData?.state === 'review') {
    const reason = checkedData?.reason ? `: ${checkedData.reason}` : '';
    throw Error(`La rentabilidad final requiere revisión${reason}. Consultanos antes de pagar.`);
  }
  const saved=await db.from('store_checkout_quotes').insert({fingerprint:checkoutFingerprint(input),rate_id:monetaryPrices.some(p=>p.usd)?exchange?.id:null,payload,prices:monetaryPrices,profitability_snapshot:checked.data,expires_at:expiresAt}).select('id').single();
  if(saved.error)throw Error('No se pudo guardar la cotización de compra.');
  return {ok:true as const,quote:{...quote,quoteId:saved.data.id as string,expiresAt,exchangeRate:exchange?.rate??undefined,exchangeLabel:exchange?exchangeRateLabel(exchange.kind):undefined},confirmationRequired:false as const,reasons:[]};
 }catch(error){return {ok:false as const,error:error instanceof Error?error.message:'No pudimos cotizar el pedido.'};}
}
export async function createOrderAction(input: OrderInput) {
  await limitCommerceRequest("order");
  if (!uuid.test(input.requestId)) throw new Error("Identificador de pedido inválido.");
  if (isShippingPaidSeparately() && input.acceptSeparateShipping !== true) throw new Error("Confirmá que el envío se cotiza y abona por separado.");
  for (const [key, max] of [["name",120],["email",254],["phone",40],["address",300],["city",120],["notes",1000]] as const) {
    if (typeof input[key] !== "string" || input[key].length > max) throw new Error("Revisá tus datos de contacto.");
  }
  if (input.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.phone.replace(/\D/g, "").length < 8) throw new Error("Completá nombre, email y teléfono válidos.");
  if (input.paymentMethod === "mercado_pago" && !isMercadoPagoConfigured()) throw new Error("Mercado Pago no está disponible. Elegí otro medio de pago.");
  if (process.env.COMMERCE_CHECKOUT_ENABLED !== "true") throw new Error("Las compras online están en preparación.");
  const session = await createServerSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const requestHash = createHash("sha256").update(JSON.stringify({ ...input, email: input.email.toLowerCase().trim(), profile: user?.id ?? null })).digest("hex");
  const service = createCommerceService();
  const { data: existing, error: retryError } = await service.from("orders").select("*").eq("request_id", input.requestId).maybeSingle();
  if (retryError) throw new Error("No pudimos verificar el pedido. Reintentá con el mismo carrito.");
  if (existing) {
    if (existing.status === "cancelled" || Date.parse(existing.reservation_expires_at) < Date.now()) throw new Error("La reserva anterior venció. Consultanos con el código antes de volver a comprar.");
    if (existing.request_hash !== requestHash) throw new Error("El intento anterior tiene otros datos. Revisá el pedido antes de continuar.");
    scheduleTransactionalEmails(existing.id);
    return { pendingConfirmation:false as const, orderId: existing.id as string, trackingCode: existing.tracking_code as string, total: Number(existing.total_amount), initPoint: existing.payment_url as string | undefined, expiresAt: existing.reservation_expires_at as string, paymentError: existing.payment_method === "mercado_pago" && !existing.payment_url ? "Pedido reservado. Contactanos con el código para recuperar el pago." : undefined };
  }
  if(!input.quoteId){
    const resolved=await resolveQuote(input);
    if(resolved.kind==='confirmation'){
      const request=await resolved.db.rpc('create_wholesale_request_v1',{payload:{request_id:input.requestId,request_hash:requestHash,profile_id:user?.id??null,contact:{name:input.name.trim(),email:input.email.toLowerCase().trim(),phone:input.phone.trim(),address:input.address,city:input.city,province:input.province,postalCode:input.postalCode,notes:input.notes},selection:input.lines,reasons:resolved.reasons}});
      if(request.error)throw new Error('No se pudo registrar la solicitud.');
      return{pendingConfirmation:true as const,trackingCode:String(request.data.reference),requestId:input.requestId};
    }
    throw Error('Actualizá el resumen para obtener una cotización de compra vigente.');
  }
  if(!uuid.test(input.quoteId))throw Error('Cotización inválida.');
  const db=createCommerceService();
  const saved=await db.from('store_checkout_quotes').select('payload,expires_at,fingerprint,profitability_snapshot').eq('id',input.quoteId).single();
  if(saved.error||saved.data.fingerprint!==checkoutFingerprint(input)||Date.parse(saved.data.expires_at)<Date.now())throw Error('La cotización venció o cambió. Actualizá el resumen.');
  const profSnapshot = saved.data.profitability_snapshot as { allowed?: boolean; state?: string } | null;
  if(profSnapshot?.allowed === false || profSnapshot?.state === 'review')throw Error('La cotización requiere confirmación de rentabilidad antes de reservar el pedido.');
  if(Number(saved.data.payload.total)!==input.expectedTotal)throw Error('El total cambió. Actualizá el resumen.');
  const pickup=saved.data.payload.shipping_option==='pickup_tandil';
  if(!pickup&&(!input.address.trim()||!input.city.trim()))throw Error('Completá el domicilio y la localidad.');
  await refreshCheckoutSupplierCatalog(db,input.lines);
  const {data:order,error}=await db.rpc('create_store_order_v1',{
    quote_input:input.quoteId,fingerprint_input:checkoutFingerprint(input),customer_input:{request_id:input.requestId,request_hash:requestHash,profile_id:user?.id??null,name:input.name.trim(),email:input.email.toLowerCase().trim(),phone:input.phone.trim(),address:pickup?'Retiro coordinado en Tandil':`${input.address}, ${input.city}, ${input.province??''}, CP ${input.postalCode}`,notes:[input.notes,isShippingPaidSeparately()?'Envío a cotizar y abonar por separado. El pago corresponde únicamente a los productos.':''].filter(Boolean).join('\n')}
  });
  if (error || !order) throw new Error("No pudimos reservar el pedido. Actualizá disponibilidad e intentá nuevamente.");
  scheduleTransactionalEmails(order.id);
  let initPoint: string | undefined = order.payment_url ?? undefined;
  if (input.paymentMethod === "mercado_pago" && !initPoint) {
    const payment = await createMercadoPagoPreference({ trackingCode: order.tracking_code, orderId: order.id, total: Number(order.total_amount), expiresAt: order.reservation_expires_at, payerEmail: input.email, payerName: input.name });
    if (!payment.success || !payment.initPoint) return { pendingConfirmation:false as const, orderId: order.id as string, trackingCode: order.tracking_code as string, total: Number(order.total_amount), initPoint: undefined, paymentError: "Tu pedido quedó reservado, pero no pudimos abrir Mercado Pago. Contactanos con el código para continuar.", expiresAt: order.reservation_expires_at as string };
    const { error: saveError } = await db.from("orders").update({ payment_url: payment.initPoint, payment_preference_id: payment.preferenceId }).eq("id", order.id);
    if (saveError) throw new Error("No pudimos guardar el enlace de pago. Contactanos antes de repetir la compra.");
    initPoint = payment.initPoint;
  }
  return { pendingConfirmation:false as const, trackingCode: order.tracking_code as string, total: Number(order.total_amount), initPoint, paymentError: undefined, expiresAt: order.reservation_expires_at as string };
}

"use server";
import { limitCommerceRequest } from "@/lib/request-limit";
import { createHash } from "node:crypto";
import { createCommerceService } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateShipping } from "@/lib/shipping";
import { priceOrder, type PricedItem } from "@/lib/order-pricing";
import { createMercadoPagoPreference } from "@/lib/mercadopago";
export interface CheckoutInput {
  lines: { productId: string; quantity: number; channel: "retail" | "wholesale" }[];
  paymentMethod: "transferencia" | "mercado_pago" | "efectivo";
  postalCode: string; shippingOptionId: string; coupon: string;
}
export interface OrderInput extends CheckoutInput {
  name: string; email: string; phone: string; address: string; city: string; notes: string;
  requestId: string; expectedTotal: number;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveQuote(input: CheckoutInput) {
  if (process.env.COMMERCE_CHECKOUT_ENABLED !== "true") throw new Error("Las compras online están en preparación. Consultanos para comprar.");
  if (!input || !Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) throw new Error("El carrito no es válido.");
  if (!["transferencia", "mercado_pago", "efectivo"].includes(input.paymentMethod)) throw new Error("Medio de pago inválido.");
  if (typeof input.postalCode !== "string" || input.postalCode.length > 12 || typeof input.coupon !== "string" || input.coupon.length > 30) throw new Error("Revisá código postal y cupón.");
  const ids = new Set<string>();
  for (const line of input.lines) {
    if (!uuid.test(line.productId) || line.channel !== "retail" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || ids.has(line.productId)) throw new Error("Revisá productos y cantidades. Solo está habilitada la compra minorista.");
    ids.add(line.productId);
  }
  const db = createCommerceService();
  const { data: products, error } = await db.from("products").select("*, categories(name, slug)").in("id", [...ids]);
  if (error || products?.length !== ids.size) throw new Error("No pudimos verificar los productos. Intentá nuevamente.");
  const { data: costs, error: costError } = await db.from("product_costs").select("*").in("product_id", [...ids]);
  if (costError) throw new Error("No pudimos verificar los precios. Consultanos para continuar.");
  const items: PricedItem[] = input.lines.map(line => {
    const p = products.find(p => p.id === line.productId)!;
    const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
    if (!p.is_active || p.is_wholesale_only || /smartphone|telefon|tecnologia|celular/i.test(category?.slug ?? "") || !p.stock_verified_at || p.stock < line.quantity) throw new Error(`Consultá disponibilidad de ${p.title} antes de comprar.`);
    const cost = costs?.find(c => c.product_id === p.id);
    const fresh = cost?.verified_at && Date.now() - Date.parse(cost.verified_at) < 30 * 86400000;
    return { id: p.id, title: p.title, quantity: line.quantity, price: Number(p.retail_price), landedCost: fresh ? Number(cost.landed_cost) : null, variableCost: Number(cost?.variable_cost ?? 0) + Number(p.retail_price) * Number(cost?.payment_fee_percent ?? 0) / 100, minimumContribution: Number(cost?.minimum_contribution ?? 0), beauty: /cosm|capilar|crema|serum|tonic|limpieza|shampoo|aceite|mascarilla/i.test(category?.name ?? "") };
  });
  const shipping = calculateShipping(input.postalCode, 0, true);
  const option = shipping.options.find(o => o.id === input.shippingOptionId);
  if (!shipping.isValid || !option) throw new Error("Elegí un destino y una opción de entrega válidos.");
  if (input.paymentMethod === "efectivo" && option.id !== "pickup_tandil") throw new Error("El efectivo está disponible al retirar en Tandil.");
  if (option.type !== "pickup") {
    if (process.env.COMMERCE_SHIPPING_ENABLED !== "true") throw new Error("El envío necesita confirmación de tarifa. Consultanos por WhatsApp o elegí retiro en Tandil.");
    const weight = products.reduce((sum, p) => sum + Number(p.specifications?.peso_kg ?? 0) * input.lines.find(l => l.productId === p.id)!.quantity, 0);
    if (products.some(p => !(Number(p.specifications?.peso_kg) > 0)) || weight > 2) throw new Error("Este pedido necesita cotización de envío por peso o volumen. Consultanos por WhatsApp o elegí retiro en Tandil.");
  }
  return { db, items, quote: priceOrder(items, input.paymentMethod, input.coupon, option.price, input.postalCode), option };
}
export async function quoteOrderAction(input: CheckoutInput) {
  try { await limitCommerceRequest("quote"); return { ok: true as const, quote: (await resolveQuote(input)).quote }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "No pudimos cotizar el pedido." }; }
}
export async function createOrderAction(input: OrderInput) {
  await limitCommerceRequest("order");
  if (!uuid.test(input.requestId)) throw new Error("Identificador de pedido inválido.");
  for (const [key, max] of [["name",120],["email",254],["phone",40],["address",300],["city",120],["notes",1000]] as const) {
    if (typeof input[key] !== "string" || input[key].length > max) throw new Error("Revisá tus datos de contacto.");
  }
  if (input.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.phone.replace(/\D/g, "").length < 8) throw new Error("Completá nombre, email y teléfono válidos.");
  if (input.paymentMethod === "mercado_pago" && !((process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN) && process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.MERCADOPAGO_COLLECTOR_ID)) throw new Error("Mercado Pago no está disponible. Elegí otro medio de pago.");
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
    return { trackingCode: existing.tracking_code as string, total: Number(existing.total_amount), initPoint: existing.payment_url as string | undefined, expiresAt: existing.reservation_expires_at as string, paymentError: existing.payment_method === "mercado_pago" && !existing.payment_url ? "Pedido reservado. Contactanos con el código para recuperar el pago." : undefined };
  }
  const { db, items, quote, option } = await resolveQuote(input);
  if (option.type !== "pickup" && (!input.address.trim() || !input.city.trim())) throw new Error("Completá domicilio o sucursal exacta y localidad.");
  if (quote.total !== input.expectedTotal) throw new Error("El precio cambió. Actualizá el resumen antes de confirmar.");
  const { data: order, error } = await db.rpc("create_retail_order_v2", {
    payload: { request_id: input.requestId, request_hash: requestHash, profile_id: user?.id ?? null, name: input.name.trim(), email: input.email.toLowerCase().trim(), phone: input.phone.trim(), address: option.type === "pickup" ? "Retiro coordinado en Tandil" : `${input.address}, ${input.city}, ${input.postalCode}`, notes: input.notes, payment: input.paymentMethod, items, subtotal: quote.subtotal, discount: quote.discount, shipping: quote.shipping, total: quote.total, shipping_option: option.id, promotion: quote.promotion },
  });
  if (error || !order) throw new Error("No pudimos reservar el pedido. Actualizá disponibilidad e intentá nuevamente.");
  let initPoint: string | undefined = order.payment_url ?? undefined;
  if (input.paymentMethod === "mercado_pago" && !initPoint) {
    const payment = await createMercadoPagoPreference({ trackingCode: order.tracking_code, orderId: order.id, total: Number(order.total_amount), expiresAt: order.reservation_expires_at, payerEmail: input.email, payerName: input.name });
    if (!payment.success || !payment.initPoint) return { trackingCode: order.tracking_code as string, total: Number(order.total_amount), initPoint: undefined, paymentError: "Tu pedido quedó reservado, pero no pudimos abrir Mercado Pago. Contactanos con el código para continuar.", expiresAt: order.reservation_expires_at as string };
    const { error: saveError } = await db.from("orders").update({ payment_url: payment.initPoint, payment_preference_id: payment.preferenceId }).eq("id", order.id);
    if (saveError) throw new Error("No pudimos guardar el enlace de pago. Contactanos antes de repetir la compra.");
    initPoint = payment.initPoint;
  }
  return { trackingCode: order.tracking_code as string, total: Number(order.total_amount), initPoint, paymentError: undefined, expiresAt: order.reservation_expires_at as string };
}

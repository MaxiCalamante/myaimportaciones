import type {CheckoutInput,OrderInput} from '../../src/app/checkout/actions';
export async function quoteOrderAction(input:CheckoutInput){
 const total=input.lines.reduce((s,l)=>s+l.quantity*50750,0);
 const lifetime=Number(sessionStorage.getItem('usdQuoteMs')??900000);
 return {ok:true,confirmationRequired:false,quote:{quoteId:'22222222-2222-4222-8222-222222222222',expiresAt:new Date(Date.now()+lifetime).toISOString(),exchangeRate:'1450',exchangeLabel:'Dólar Blue venta',subtotal:total,total,discount:0,shipping:0,promotion:'',couponMessage:'',shippingQuotedSeparately:true}};
}
export async function createOrderAction(input:OrderInput){
 if(input.quoteId!=='22222222-2222-4222-8222-222222222222')throw Error('Falta el presupuesto aceptado del servidor.');
 Object.assign(window,{submitted:input});return {pendingConfirmation:false,trackingCode:'QA-NO-REAL-ORDER',total:input.expectedTotal,expiresAt:'2099-01-01',initPoint:input.paymentMethod==='mercado_pago'?'https://www.mercadopago.com.ar/checkout/test':undefined};
}

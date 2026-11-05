import type {CheckoutInput,OrderInput} from '../../src/app/checkout/actions';
import type {Product} from '../../src/lib/types';
declare global { interface Window { quoteState?: {price:number;error?:boolean}; submitted?:OrderInput; testProduct:Product } }
import {validateWholesaleOrder} from '../../src/lib/wholesale-policy';
export async function quoteOrderAction(input:CheckoutInput){
 const state=JSON.parse(sessionStorage.getItem('quoteState')||'{"price":50000}') as {price:number;error?:boolean};
 if(state.error)return{ok:false,error:'No se pudo verificar el total'};
 const total=input.lines.reduce((s,l)=>s+l.quantity*state.price,0);
 const minimum=validateWholesaleOrder(input.lines.map((l)=>({...l,price:state.price})));
 if(!minimum.meetsMinimum)return{ok:false,error:minimum.errorMessage};
 return{ok:true,confirmationRequired:false,quote:{subtotal:total,total,discount:0,shipping:0,promotion:'',couponMessage:'',shippingQuotedSeparately:true}};
}
export async function createOrderAction(input:OrderInput){window.submitted=input;return{pendingConfirmation:false,trackingCode:'TEST-ONLY',total:input.expectedTotal,expiresAt:'2099-01-01',initPoint:input.paymentMethod==='mercado_pago'?'https://www.mercadopago.com.ar/checkout/test':undefined};}

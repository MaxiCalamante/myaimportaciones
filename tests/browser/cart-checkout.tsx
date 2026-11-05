import React from 'react';
import {createRoot} from 'react-dom/client';
import {CommerceProvider,useCommerce} from '../../src/components/commerce/commerce-provider';
import {QuantityStepper} from '../../src/components/commerce/quantity-stepper';
import {CheckoutPanel} from '../../src/components/checkout/checkout-panel';
import type {Product} from '../../src/lib/types';
const product:Product={id:'11111111-1111-4111-8111-111111111111',slug:'test',title:'Producto de prueba',description:'',categoryId:'c',categoryName:'',imageUrl:'',retailPrice:80000,wholesalePrice:50000,wholesaleMinQuantity:1,stock:0,paymentMethods:['transferencia','mercado_pago'],tags:[],featured:false,wholesaleOnly:true,fulfillmentMode:'supplier',supplierAvailable:true};
Object.assign(window,{testProduct:product});
function TestApp(){
 const c=useCommerce();
 return <><button onClick={()=>c.addToCart(product,'wholesale',3)}>Agregar tres</button><button onClick={()=>c.addToCart({...product,fulfillmentMode:'own_stock',stock:1,stockVerifiedAt:'2026-11-04'},'wholesale',1)}>Agregar desde ficha anterior</button><button onClick={()=>c.setPostalCode('7000')}>Destino de prueba</button><button onClick={()=>c.clearCart()}>Vaciar</button><output id="count">{c.cartCount}</output><output id="total">{c.cartTotal}</output>{c.cart.map(l=><QuantityStepper key={l.product.id} quantity={l.quantity} max={100} onChange={q=>c.updateQuantity(l.product.id,l.channel,q,l.variantId)}/>)}<CheckoutPanel profile={null} checkoutEnabled mercadoPagoEnabled/></>;
}
createRoot(document.getElementById('root')!).render(<CommerceProvider><TestApp/></CommerceProvider>);

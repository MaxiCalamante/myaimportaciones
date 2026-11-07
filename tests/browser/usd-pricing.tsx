import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CurrencyProvider} from '../../src/components/commerce/currency-provider';
import {CommerceProvider,useCommerce} from '../../src/components/commerce/commerce-provider';
import {ProductCard} from '../../src/components/commerce/product-card';
import {ProductDetailInteractive} from '../../src/components/commerce/product-detail-interactive';
import{SiteHeader}from'../../src/components/layout/site-header';
import{StickyMobileBuyBar}from'../../src/components/commerce/sticky-mobile-buy-bar';
import{WholesaleQuotePrintable}from'../../src/components/wholesale/wholesale-quote-printable';
import {CartDrawer} from '../../src/components/commerce/cart-drawer';
import {CheckoutPanel} from '../../src/components/checkout/checkout-panel';
import type {Product} from '../../src/lib/types';
const product:Product={id:'11111111-1111-4111-8111-111111111111',slug:'qa-usd',title:'Producto QA USD',description:'Presentación sintética para verificar la moneda, los importes y el recorrido de compra.',categoryId:'qa',categoryName:'QA',imageUrl:'/placeholder-product.svg',retailPrice:50750,wholesalePrice:36250,retailUsd:'35.00',wholesaleUsd:'25.00',wholesaleMinQuantity:1,stock:0,paymentMethods:['transferencia','mercado_pago'],tags:[],featured:false,wholesaleOnly:false,fulfillmentMode:'supplier',supplierAvailable:true,wholesaleOffer:{productId:'11111111-1111-4111-8111-111111111111',variantId:null,unitPrice:36250,status:'ready',reason:'Local QA',tiers:[],validUntil:'2099-01-01',policyId:'qa'}};
Object.assign(window,{testProduct:product});
function App(){const c=useCommerce(),[checkout,setCheckout]=useState(false),[printing,setPrinting]=useState(false);
 return <><SiteHeader/><main className="mx-auto max-w-5xl space-y-6 p-4"><div className="flex flex-wrap gap-3"><button onClick={()=>c.setCartOpen(true)}>Abrir carrito QA</button><button onClick={()=>{c.addToCart(product,'wholesale',3);c.setCartOpen(false);setPrinting(true);}}>Ver impresión QA</button><button onClick={()=>{c.setPostalCode('7000');setCheckout(true);}}>Ir al checkout QA</button></div>{printing?<WholesaleQuotePrintable profile={null} header={{quoteNumber:'QA-LOCAL',issueDate:'06/11/2026',expirationDate:'06/11/2026'}}/>:checkout?<CheckoutPanel profile={null} checkoutEnabled mercadoPagoEnabled/>:<><div className="grid grid-cols-2 gap-3"><ProductCard product={product}/></div><ProductDetailInteractive product={product}/></>}</main>{!printing&&!checkout&&new URLSearchParams(location.search).has('sticky')&&<div data-testid="audit-sticky"><StickyMobileBuyBar usd="35.00" price={50750} quantity={3} added={false} onAddToCart={()=>{}} onOpenWhatsApp={()=>{}} cartCount={0} onOpenCart={()=>{}} visible/></div>}<CartDrawer checkoutEnabled/></>;
}
const now=new Date().toISOString();
createRoot(document.getElementById('root')!).render(<CurrencyProvider snapshot={{id:'qa-rate',kind:'blue',rate:'1450',rawRate:'1450',sourceAt:now,fetchedAt:now,expiresAt:'2099-01-01T00:00:00Z',status:'valid',source:'dolarapi',adjustment:'0',roundArs:'1'}}><CommerceProvider><App/></CommerceProvider></CurrencyProvider>);

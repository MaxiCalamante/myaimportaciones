import test from "node:test";
import assert from "node:assert/strict";
import { offerEvidence, parseObservation, parseOffersCsv, supplierSourceUrl, type IntelligenceSupplier, type SupplierOffer } from "../src/lib/supplier-intelligence";
import { parseRegisteredOffer } from "../src/lib/supplier-offer-adapters";
const supplier: IntelligenceSupplier = {id:"11111111-1111-4111-8111-111111111111",name:"Star",website:"https://www.starcompany-py.com/",official_key:"star-company",query_mode:"product_page",automation_authorized:false,freshness_hours:24,is_active:true,capabilities:{}};
const stamp = new Date().toISOString();
const raw = { external_id:"123",variant_key:"attribute:0",title:"Producto 50 ml",brand:"Marca",model:"Modelo",source_url:"https://www.starcompany-py.com/producto",origin_cost:10,currency:"USD",availability:"in_stock",verification:"verified",observed_at:stamp };
const offer: SupplierOffer = {...parseObservation(raw,supplier), id:"offer", cost_checked_at:stamp,availability_checked_at:stamp,last_success_at:stamp,last_attempt_at:stamp,last_error:null};
test("CSV conserva identidad y variantes; no fusiona por títulos similares", () => {
  const header="external_id,variant_key,title,source_url,origin_cost,currency,availability,verification,observed_at\n";
  const row=`123,50ml,Producto,https://www.starcompany-py.com/p,10,USD,in_stock,verified,${stamp}\n`;
  assert.equal(parseOffersCsv(header+row+row.replace("50ml","100ml"),supplier).length,2);
  assert.throws(() => parseOffersCsv(header+row+row,supplier),/duplicados/);
  assert.throws(() => parseOffersCsv(header+row.replace(",10,",",-1,"),supplier),/Fila 2/);
});
test("fuentes externas rechazan esquemas, credenciales, puertos y host engañoso", () => {
  for(const url of ["http://www.starcompany-py.com/p","https://user:pw@www.starcompany-py.com/p","https://www.starcompany-py.com.evil.test/p","https://127.0.0.1/","https://www.starcompany-py.com:444/p"]) assert.throws(()=>supplierSourceUrl(url,supplier));
  assert.equal(supplierSourceUrl("https://starcompany-py.com/p#x",supplier),"https://starcompany-py.com/p");
});
test("evidencia antigua o error conserva datos pero no se recomienda como vigente", () => {
  assert.equal(offerEvidence(offer,supplier).usable,true);
  assert.equal(offerEvidence({...offer,availability_checked_at:"2020-01-01T00:00:00Z"},supplier).usable,false);
  assert.equal(offerEvidence({...offer,cost_checked_at:null},supplier).usable,false);
  assert.equal(offerEvidence({...offer,last_error:"timeout"},supplier).usable,false);
  assert.match(offerEvidence({...offer,last_error:"timeout"},supplier).label,/conserva/);
});
test("manual valida moneda, fecha, EAN y pertenencia de variantes", () => {
  assert.throws(()=>parseObservation({...raw,origin_cost:"9,99"},supplier),/costo/);
  assert.throws(()=>parseObservation({...raw,observed_at:"2099-01-01"},supplier),/fecha/);
  assert.throws(()=>parseObservation({...raw,gtin:"bad"},supplier),/GTIN/);
  assert.throws(()=>parseObservation({...raw,variant_id:supplier.id},supplier),/variante/);
});
test("adaptador exige producto y atributo exactos, ignora relacionados", () => {
  const html=(p:unknown)=>`<div id="product-details" data-product='${JSON.stringify(p)}'></div>`;
  const p={id_product:123,id_product_attribute:0,quantity:4,price_amount:9.99,price_currency_code:"USD"};
  assert.deepEqual(parseRegisteredOffer(html(p),offer,supplier),{ok:true,values:{availability:"in_stock",origin_cost:9.99,currency:"USD"}});
  assert.equal(parseRegisteredOffer(html({...p,id_product:999}),offer,supplier).ok,false);
  assert.equal(parseRegisteredOffer(html({...p,id_product_attribute:2}),offer,supplier).ok,false);
  assert.equal(parseRegisteredOffer(html({...p,price_currency_code:undefined}),offer,supplier).ok,true);
  assert.deepEqual(parseRegisteredOffer(html({...p,price_currency_code:undefined}),offer,supplier),{ok:true,values:{availability:"in_stock",origin_cost:null,currency:null}});
  const currencyPage=html({...p,price_currency_code:undefined})+'<script>var prestashop = {"currency":{"iso_code":"USD"},"text":"quoted } brace"};</script>';
  assert.deepEqual(parseRegisteredOffer(currencyPage,offer,supplier),{ok:true,values:{availability:"in_stock",origin_cost:9.99,currency:"USD"}});
  assert.deepEqual(parseRegisteredOffer(html({...p,price_currency_code:undefined})+'<script>var prestashop = {currency:executeUntrustedScript()};</script>',offer,supplier),{ok:true,values:{availability:"in_stock",origin_cost:null,currency:null}});
  assert.equal(parseRegisteredOffer("<p>in stock 9.99</p>",offer,supplier).ok,false);
});
test("Connect excluye CPO, outlet y activados", () => {
  const connect={...supplier,official_key:"atacado-connect",website:"https://atacadoconnect.com/"};
  for(const condition of ["CPO","OUTLET","refurbished","Ativo"]) assert.throws(()=>parseObservation({...raw,title:`iPhone 16 ${condition}`,source_url:"https://atacadoconnect.com/p"},connect),/nuevo sellado/);
});

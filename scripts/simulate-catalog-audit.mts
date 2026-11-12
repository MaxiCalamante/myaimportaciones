/** Private, read-only inventory. Commercial conclusions belong to the SQL audit. */
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readAllPages} from '../src/lib/read-all-pages';

interface Product {
 id:string;title:string;is_active:boolean;deleted_at:string|null;
 commercial_status?:string|null;
}
interface Variant {id:string;product_id:string;title:string;is_active:boolean;commercial_status?:string|null}
interface UsdPrice {id:string;product_id:string;variant_id:string|null;retail_usd:string|null;wholesale_usd:string|null}
interface Offer {id:string;product_id:string|null;variant_id:string|null;supplier_id:string}
interface Supplier {id:string}

async function inventoryTable<T extends {id:string}>(db:SupabaseClient,table:string,columns:string):Promise<T[]>{
 const count=async()=>{
  const result=await db.from(table).select('id',{count:'exact',head:true});
  if(result.error||result.count===null)throw Error(`No se pudo contar el inventario: ${table}`);
  return result.count;
 };
 const before=await count();
 const rows=await readAllPages<T>((from,to)=>db.from(table).select(columns).order('id').range(from,to)
  .then(({data,error})=>({data:data as unknown as T[]|null,error})));
 const after=await count();
 if(before!==after||rows.length!==before||new Set(rows.map(row=>row.id)).size!==rows.length){
  throw Error(`Inventario incompleto o cambiado durante la lectura: ${table}; repetí la consulta.`);
 }
 return rows;
}

/** Reads every stored identity without changing prices, source evidence or stock. */
export async function readCatalogInventory(db:SupabaseClient){
 const [products,variants,prices,offers,suppliers]=await Promise.all([
  inventoryTable<Product>(db,'products','id,title,is_active,deleted_at,commercial_status'),
  inventoryTable<Variant>(db,'product_variants','id,product_id,title,is_active,commercial_status'),
  inventoryTable<UsdPrice>(db,'product_usd_prices','id,product_id,variant_id,retail_usd,wholesale_usd'),
  inventoryTable<Offer>(db,'supplier_offers','id,product_id,variant_id,supplier_id'),
  inventoryTable<Supplier>(db,'suppliers','id'),
 ]);
 const productById=new Map(products.map(product=>[product.id,product]));
 if(variants.some(variant=>!productById.has(variant.product_id)))throw Error('Inventario inconsistente: variante sin producto; repetí la consulta.');
 const key=(productId:string,variantId:string|null)=>`${productId}:${variantId??''}`;
 const priceByIdentity=new Map(prices.map(price=>[key(price.product_id,price.variant_id),price]));
 const offerCounts=new Map<string,number>();
 for(const offer of offers){
  if(offer.product_id===null)continue;
  const identity=key(offer.product_id,offer.variant_id);
  offerCounts.set(identity,(offerCounts.get(identity)??0)+1);
 }
 const identity=(product:Product,variant:Variant|null)=>{
  const identityKey=key(product.id,variant?.id??null),price=priceByIdentity.get(identityKey);
  return {
   productId:product.id,variantId:variant?.id??null,title:variant?`${product.title} · ${variant.title}`:product.title,
   auditStatus:'pending' as const,
   reason:'Inventario registrado; costo, disponibilidad, medio de pago y rentabilidad pendientes de auditoría SQL central.',
   active:variant?.is_active??product.is_active,parentActive:product.is_active,deletedAt:product.deleted_at,
   recordedCommercialStatus:(variant??product).commercial_status??null,
   recordedRetailUsd:price?.retail_usd??null,recordedWholesaleUsd:price?.wholesale_usd??null,
   offerCount:offerCounts.get(identityKey)??0,
  };
 };
 const rows=[...products.map(product=>identity(product,null)),...variants.map(variant=>identity(productById.get(variant.product_id)!,variant))];
 return {
  at:new Date().toISOString(),authoritative:false,transactionalSnapshot:false,
  note:'Lectura privada paginada con conteos verificados por tabla. No certifica disponibilidad, costos ni publicabilidad; no cambia datos. Las ofertas incluyen todos sus estados registrados. Las lecturas entre tablas no forman una instantánea transaccional.',
  nextStep:'Usar store_audit_catalog_v1 en modo simulate para la auditoría comercial central, transaccional y recuperable; este script no llama RPC ni aplica cambios.',
  tables:{products:products.length,variants:variants.length,usdPrices:prices.length,offers:offers.length,suppliers:suppliers.length},
  identities:rows.length,rows,
 };
}

async function main(){
 for(const file of ['.env.local','.env']){
  const path=resolve(process.cwd(),file);
  if(existsSync(path))loadEnvFile(path);
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Faltan credenciales privadas de Supabase para leer el inventario.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 console.log(JSON.stringify(await readCatalogInventory(db),null,2));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:'No se pudo completar el inventario.');process.exitCode=1;});
}

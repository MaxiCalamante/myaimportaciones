import 'server-only';
import {getAdminClient} from './admin-auth';
import {readAdminProducts} from './admin-catalog-read';
import {readAllPages} from './read-all-pages';
import {auditWholesaleCatalog} from './wholesale-catalog-audit';

export async function readWholesaleCatalogAudit(){
 const db=await getAdminClient();
 const optional=async(table:string)=>{
  const r=await db.from(table).select('*');
  if(r.error){if(['42P01','PGRST205'].includes(r.error.code))return[];throw new Error('No se pudo leer la revisión del catálogo.');}
  return r.data??[];
 };
 const [products,variants,costs,offers,suppliers,categories,controls,variantCosts]=await Promise.all([
  readAllPages((from,to)=>readAdminProducts(db,{from,size:to-from+1})),
  readAllPages((from,to)=>db.from('product_variants').select('*').order('id').range(from,to)),
  readAllPages((from,to)=>db.from('product_costs').select('*').order('product_id').range(from,to)),
  readAllPages((from,to)=>db.from('supplier_offers').select('*').order('id').range(from,to)),
  optional('suppliers'),optional('categories'),optional('wholesale_product_controls'),optional('wholesale_variant_costs'),
 ]);
 return auditWholesaleCatalog({products,variants,costs,offers,suppliers,categories,controls,variantCosts});
}

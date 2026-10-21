import 'server-only';
import { notFound } from 'next/navigation';
import { getAdminClient } from './admin-auth';
import { adminDate, adminPageNumber, salesStatuses, UUID_PATTERN, type CustomerDirectory, type SalesList } from './admin-commerce-types';

export type AdminSearch = Record<string,string|string[]|undefined>;
export function param(params: AdminSearch,key:string) { return typeof params[key]==='string' ? params[key] as string:''; }
export async function getSales(params: AdminSearch) {
 const db=await getAdminClient();
 const q=param(params,'buscar').trim().slice(0,100), status=param(params,'estado');
 const page=adminPageNumber(param(params,'pagina')), customer=param(params,'cliente');
 const from=adminDate(param(params,'desde')),to=adminDate(param(params,'hasta'));
 const {data,error}=await db.rpc('admin_sales_list_v1',{q_input:q,status_input:salesStatuses.includes(status as typeof salesStatuses[number])?status:'',page_input:page,customer_input:UUID_PATTERN.test(customer)?customer:null,from_input:from,to_input:to});
 if(error||!data) throw new Error('No se pudieron cargar las ventas. Volvé a intentarlo.');
 return {data:data as SalesList,page,q,status,customer,from,to};
}
export async function getCustomers(params: AdminSearch) {
 const db=await getAdminClient();const q=param(params,'buscar').trim().slice(0,100), raw=param(params,'filtro');
 const filter=['favorites','cart','buyers'].includes(raw)?raw:'';const page=adminPageNumber(param(params,'pagina'));
 const {data,error}=await db.rpc('admin_customer_directory_v1',{q_input:q,filter_input:filter,page_input:page});
 if(error||!data) throw new Error('No se pudieron cargar los clientes. Volvé a intentarlo.');
 return {data:data as CustomerDirectory,page,q,filter};
}
export async function getSale(id:string) {
 const db=await getAdminClient();if(!UUID_PATTERN.test(id)) notFound();
 const [order,emails]=await Promise.all([
  db.from('orders').select('id,profile_id,status,payment_method,subtotal_amount,discount_amount,shipping_amount,total_amount,shipping_name,shipping_phone,shipping_address,customer_email,order_notes,tracking_code,created_at,updated_at,reservation_expires_at,reservation_released,payment_id,payment_review,paid_at,shipping_option,promotion,carrier_tracking_code,profiles(id,full_name,email,phone),order_items(id,product_id,product_title,quantity,unit_price,variant_id,variant_title,variant_sku,fulfillment_mode)').eq('id',id).maybeSingle(),
  db.from('email_outbox').select('id,event_type,audience,status,delivery_status,last_error,created_at,sent_at').eq('order_id',id).order('created_at',{ascending:false}).limit(30),
 ]);
 if(order.error||emails.error) throw new Error('No se pudo cargar el detalle de la venta.');
 if(!order.data)notFound();
 return {order:order.data,emails:emails.data??[]};
}
export async function getCustomer(id:string) {
 const db=await getAdminClient();if(!UUID_PATTERN.test(id))notFound();
 const [profile,favorites,cart,preferences,sales]=await Promise.all([
  db.from('profiles').select('id,full_name,email,phone,role,created_at,business_name,cuit,is_approved_wholesale').eq('id',id).maybeSingle(),
  db.from('favorites').select('product_id,created_at,products(id,title,slug,image_url,retail_price,is_active)').eq('profile_id',id).order('created_at',{ascending:false}).limit(500),
  db.from('account_carts').select('items,updated_at').eq('profile_id',id).maybeSingle(),
  db.from('email_preferences').select('promotions,cart_reminders').eq('profile_id',id).maybeSingle(),
  db.rpc('admin_sales_list_v1',{customer_input:id,page_input:1}),
 ]);
 if([profile,favorites,cart,preferences,sales].some(r=>r.error))throw new Error('No se pudo cargar la información del cliente.');
 if(!profile.data)notFound();
 const items=(cart.data?.items??[]) as {id:string;variant_id:string|null;quantity:number}[];
 const ids=[...new Set(items.map(i=>i.id))];
 const products=ids.length?await db.from('products').select('id,title,slug,retail_price,is_active,product_variants(id,title,sku,retail_price,is_active)').in('id',ids):{data:[],error:null};
 if(products.error)throw new Error('No se pudo leer el carrito guardado.');
 return {profile:profile.data,favorites:favorites.data??[],cart:cart.data,items,products:products.data??[],preferences:preferences.data,sales:sales.data as SalesList};
}

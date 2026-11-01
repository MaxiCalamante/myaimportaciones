'use server';
import {getAdminClient} from '@/lib/admin-auth';
import {catalogId} from '@/lib/supplier-catalog-import';
import {revalidatePath} from 'next/cache';
export async function saveSupplyOperation(form:FormData){
 const db=await getAdminClient(),orderId=catalogId(String(form.get('order_id'))),itemId=catalogId(String(form.get('item_id')));
 const amount=(key:string)=>form.get(key)?Number(form.get(key)):null;
 const result=await db.rpc('set_order_supply_operation_v1',{order_item_input:itemId,expected_version_input:Number(form.get('version')),request_id_input:crypto.randomUUID(),payload_input:{status:String(form.get('status')),supplier_id:form.get('supplier_id')||null,actual_cost:amount('actual_cost'),estimated_cost:amount('estimated_cost'),tracking_code:String(form.get('tracking_code')||''),responsible:String(form.get('responsible')||''),notes:String(form.get('notes')||'')}});
 if(result.error)throw new Error('No se guardó el seguimiento. Revisá pago, transición y versión del registro.');
 revalidatePath('/admin/ventas/'+orderId);
}

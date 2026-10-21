import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseAccountCart } from '@/lib/account-cart';
export async function POST(req:Request) {
 const headers={'Cache-Control':'private, no-store'};
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Origen inválido'},{status:403,headers});
 if(Number(req.headers.get('content-length'))>15000)return NextResponse.json({error:'Carrito demasiado grande'},{status:413,headers});
 const text=await req.text();if(text.length>15000)return NextResponse.json({error:'Carrito demasiado grande'},{status:413,headers});
 let body:Record<string,unknown>;
 try{body=JSON.parse(text);if(!body||typeof body!=='object')throw new Error();}catch{return NextResponse.json({error:'Carrito inválido'},{status:400,headers});}
 const items=parseAccountCart(body.items);if(!items)return NextResponse.json({error:'Carrito inválido'},{status:400,headers});
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Iniciá sesión'},{status:401,headers});
 if(body.profile_id!==user.id)return NextResponse.json({error:'La sesión cambió. Recargá la página.'},{status:409,headers});
 const saved=await db.rpc('save_account_cart_v1',{items_input:items});
 if(saved.error)return NextResponse.json({error:'No se pudo guardar el carrito'},{status:400,headers});
 // This existing RPC independently enforces opt-in. Operational persistence never enables email consent.
 const reminder=await db.rpc('save_email_cart_v1',{items_input:items});
 if(reminder.error)return NextResponse.json({error:'Carrito guardado; no se pudo actualizar el recordatorio'},{status:503,headers});
 return new Response(null,{status:204,headers});
}

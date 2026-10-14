import { getAdminClient } from '@/lib/admin-auth';
import { fail,response,GiveawayError } from '@/lib/giveaway/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{const db=await getAdminClient(),{id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))throw new GiveawayError('Identificador inválido.');const {data,error}=await db.from('giveaway_rounds').select('audit,reveal_at').eq('id',id).single();if(error||!data)throw new GiveawayError('Acta no encontrada.',404);if(Date.now()<Date.parse(data.reveal_at))throw new GiveawayError('La revelación todavía no terminó.',409);return response(data.audit);}catch(e){return fail(e);}
}

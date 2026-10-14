import { getAdminClient } from '@/lib/admin-auth';
import { dbError } from '@/lib/giveaway/server/data';
import { fail,response } from '@/lib/giveaway/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const db=await getAdminClient();const {data,error}=await db.rpc('giveaway_admin_history_v1');dbError(error);return response(data);}catch(e){return fail(e);}}

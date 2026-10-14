import { publicState } from '@/lib/giveaway/server/data';
import { fail } from '@/lib/giveaway/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await publicState(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return fail(e);}}

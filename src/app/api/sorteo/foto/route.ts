import { readProfile } from '@/lib/giveaway/server/profiles';
import { publicState } from '@/lib/giveaway/server/data';
import { createCommerceService } from '@/lib/supabase/service';
import { profilePhoto } from '@/lib/giveaway/server/profile-photo';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: Request) {
  try {
    const state = await publicState(), round = new URL(request.url).searchParams.get('round');
    // The database's public projection is the authority for revealing a photo.
    if (!state.winner || !state.round || round !== state.round.id) return new Response(null, {status:204,headers});
    const {data,error} = await createCommerceService().from('giveaway_rounds').select('audit->draws').eq('id',round).single();
    if(error) throw error;
    const draws = data?.draws as {winner?:{username?:string;avatar?:string}}[] | undefined;
    const winner = Array.isArray(draws) ? draws.at(-1)?.winner : null;
    if(winner?.username !== state.winner.username) return new Response(null,{status:204,headers});
    let photo = await profilePhoto(winner.avatar);
    if(!photo){const fresh=await readProfile(state.winner.username);if(fresh?.avatar)photo=await profilePhoto(fresh.avatar);}
    if(!photo) return new Response(null,{status:204,headers});
    return new Response(new Uint8Array(photo), {headers:{...headers,'Content-Type':'image/png'}});
  } catch { return new Response(null,{status:204,headers}); }
}

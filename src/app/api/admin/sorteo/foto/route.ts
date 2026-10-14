import { getAdminClient } from '@/lib/admin-auth';
import { privateState } from '@/lib/giveaway/server/data';
import { profilePhoto } from '@/lib/giveaway/server/profile-photo';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
  try{await getAdminClient();}catch{return new Response(null,{status:401,headers:{...headers,'Cache-Control':'no-store'}});}
  try{
    const handle=new URL(request.url).searchParams.get('usuario');
    if(!handle||!/^[a-z0-9._]{1,30}$/.test(handle))return new Response(null,{status:400,headers});
    const state=await privateState(),comment=state.snapshot?.comments.find(c=>c.username===handle&&c.avatar);
    const photo=await profilePhoto(comment?.avatar);
    return photo?new Response(new Uint8Array(photo),{headers:{...headers,'Content-Type':'image/png'}}):new Response(null,{status:204,headers});
  }catch{return new Response(null,{status:204,headers});}
}

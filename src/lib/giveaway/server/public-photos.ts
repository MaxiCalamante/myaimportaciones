import 'server-only';
import type { PublicGiveaway } from '../live';
import type { Audit } from '../types';
import { createCommerceService } from '@/lib/supabase/service';
import { reelPhotoKeys } from './photo-keys';

let cached:{round:string;until:number;photos:Map<string,string>}|null=null;
let pending:{round:string;promise:Promise<Map<string,string>>}|null=null;
export async function publicReelPhotos(state:PublicGiveaway):Promise<PublicGiveaway>{
  if(!state.available||!state.round||!state.reel.length)return state;
  const round=state.round.id;
  async function read(){
    const db=createCommerceService();
    const {data,error}=await db.from('giveaway_rounds').select('audit').eq('id',round).single();
    if(error||!data)return new Map<string,string>();
    const audit=data.audit as Audit;
    // Only photos for identities already released by the public projection are signed.
    const entries=reelPhotoKeys(state.reel,audit.snapshot.review.valid);
    if(!entries.length)return new Map<string,string>();
    const {data:urls}=await db.storage.from('giveaway-avatars').createSignedUrls([...new Set(entries.map(e=>e.key))],600);
    const byPath=new Map((urls||[]).filter(u=>!u.error&&u.signedUrl).map(u=>[u.path,u.signedUrl]));
    const photos=new Map(entries.flatMap(e=>byPath.has(e.key!)?[[e.username,byPath.get(e.key!)!] as const]:[]));
    cached={round,until:Date.now()+240000,photos};return photos;
  }
  try{
    let photos:Map<string,string>;
    if(cached?.round===round&&Date.now()<cached.until)photos=cached.photos;
    else{
      if(pending?.round!==round)pending={round,promise:read()};
      const request=pending;try{photos=await request.promise;}finally{if(pending===request)pending=null;}
    }
    return {...state,reel:state.reel.map(c=>({...c,...(photos.get(c.username)?{avatar:photos.get(c.username)}:{})}))};
  }catch{return state;}
}

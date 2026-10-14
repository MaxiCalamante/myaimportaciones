import 'server-only';
import { createHash } from 'node:crypto';
import { createCommerceService } from '@/lib/supabase/service';
import { validInstagramPhoto } from '../photos';
import { instagramPhoto } from './photo';

// This bucket is private. Only authenticated admin previews and a revealed winner can read it.
export async function profilePhoto(src:unknown){
  if(!validInstagramPhoto(src))return null;
  const bucket=createCommerceService().storage.from('giveaway-avatars');
  const key=createHash('sha256').update(src).digest('hex')+'.png';
  try{
    const {data}=await bucket.download(key);
    if(data&&data.size<=2_000_000){const bytes=Buffer.from(await data.arrayBuffer());if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return bytes;}
  }catch{}
  const photo=await instagramPhoto(src).catch(()=>null);
  if(!photo)return null;
  try{await bucket.upload(key,photo,{contentType:'image/png',upsert:false});}catch{}
  return photo;
}

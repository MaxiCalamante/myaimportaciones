import { createHash } from 'node:crypto';
import { validInstagramPhoto } from '../photos';
import type { Comment } from '../types';
export function profilePhotoKey(src:unknown){return validInstagramPhoto(src)?createHash('sha256').update(src).digest('hex')+'.png':null;}
export function reelPhotoKeys(reel:Pick<Comment,'username'>[],valid:Comment[]){
  const eligible=new Map(valid.map(c=>[c.username,c]));
  return reel.map(c=>({username:c.username,key:profilePhotoKey(eligible.get(c.username)?.avatar)})).filter((e):e is {username:string;key:string}=>Boolean(e.key));
}

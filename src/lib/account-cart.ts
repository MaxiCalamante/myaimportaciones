import { UUID_PATTERN } from './admin-commerce-types';
import type { CartLine } from './types';
export interface AccountCartItem { id:string; variant_id:string|null; quantity:number }
export function parseAccountCart(value:unknown):AccountCartItem[]|null {
 if(!Array.isArray(value)||value.length>50)return null;
 const keys=new Set<string>(),items:AccountCartItem[]=[];
 for(const raw of value){
  if(!raw||typeof raw!=='object')return null;
  const {id,variant_id,quantity}=raw as Record<string,unknown>;
  if(typeof id!=='string'||!UUID_PATTERN.test(id)||variant_id!=null&&(typeof variant_id!=='string'||!UUID_PATTERN.test(variant_id))||!Number.isInteger(quantity)||Number(quantity)<1||Number(quantity)>100)return null;
  const key=`${id.toLowerCase()}:${typeof variant_id==='string'?variant_id.toLowerCase():''}`;
  if(keys.has(key))return null;keys.add(key);
  items.push({id:id.toLowerCase(),variant_id:typeof variant_id==='string'?variant_id.toLowerCase():null,quantity:Number(quantity)});
 }
 return items;
}
export function accountCartStorageKey(accountId?:string) {return accountId?`mm-cart:${accountId}`:'mm-cart';}
export function mergeGuestCart(account:CartLine[],guest:CartLine[]) {
 const result=account.map(line=>({...line}));
 for(const line of guest){const match=result.find(i=>i.product.id===line.product.id&&(i.variantId||null)===(line.variantId||null)&&i.channel===line.channel);if(match)match.quantity=Math.min(100,Math.max(match.quantity,line.quantity));else result.push({...line});}
 return result;
}

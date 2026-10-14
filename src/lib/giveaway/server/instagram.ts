import { GiveawayError } from './http';
import type { Comment } from '../types';
import { username } from '../participants';

type Page<T> = { data: T[]; paging?: { next?: string; cursors?: { after?: string } } };
type ApiComment = { id: string; text?: string; timestamp?: string; username?: string; from?: { username?: string }; replies?: Page<ApiComment> };
export function mergeComments(previous: Comment[], incoming: Comment[]) {
  const records = new Map(previous.map(c => [c.id, c]));
  for (const c of incoming) records.set(c.id, { ...records.get(c.id), ...c });
  return [...records.values()];
}
export function postKey(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.username || url.password) throw new GiveawayError('Usá el enlace HTTPS de Instagram.');
  const key = url.pathname.match(/^\/(?:p|reel)\/([\w-]+)\/?$/)?.[1];
  if (!key) throw new GiveawayError('El enlace debe ser una publicación o un reel.');
  return key;
}
export async function graph<T>(edge: string, token: string, params: Record<string,string> = {}): Promise<T> {
  if (!/^[\w/]+$/.test(edge)) throw new GiveawayError('Recurso de Meta inválido.');
  const url = new URL(`https://graph.facebook.com/v26.0/${edge}`);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  let response: Response;
  try { response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(20000) }); }
  catch { throw new GiveawayError('Meta no respondió. La lista anterior se conserva; reintentá.',502); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    if (result.error?.code === 190) throw new GiveawayError('El acceso a Instagram venció. Es necesario renovar la conexión de Meta.',401);
    if (response.status === 429 || [4,17,32,613].includes(result.error?.code)) throw new GiveawayError('Meta limitó temporalmente las consultas. Reintentá más tarde; no se guardó una carga parcial.',429);
    throw new GiveawayError('Meta rechazó la lectura. Revisá la conexión de MYA y los permisos de comentarios.',502);
  }
  return result;
}
export async function* pages<T>(edge:string, token:string, params:Record<string,string>, first?:Page<T>) {
  let after=''; const seen=new Set<string>();
  for(let i=0;i<1000;i++) {
    const page:Page<T> = i===0&&first ? first : await graph(edge,token,{...params,...(after?{after}:{})});
    if(!Array.isArray(page.data))throw new GiveawayError('Meta devolvió una lista incompleta. No se guardaron cambios.',502);
    yield page.data;
    if(!page.paging?.next)return;
    const next=new URL(page.paging.next);
    if(next.protocol!=='https:'||next.hostname!=='graph.facebook.com')throw new GiveawayError('Paginación de Meta inválida.',502);
    after=page.paging.cursors?.after||next.searchParams.get('after')||'';
    if(!after||seen.has(after))throw new GiveawayError('Meta no permitió completar la paginación. La lista anterior se conserva.',502);
    seen.add(after);
  }
  throw new GiveawayError('La lectura excedió el límite de páginas. No se guardó una lista parcial.',502);
}
export async function readInstagramComments(permalink:string) {
  const token=process.env.INSTAGRAM_ACCESS_TOKEN;
  if(!token)throw new GiveawayError('Falta activar la conexión privada de Instagram en el servidor.',503);
  const account=await graph<{id:string;username:string}>('17841402381081579',token,{fields:'id,username'});
  if(account.username!=='_myaimportaciones')throw new GiveawayError('La conexión no corresponde a MYA.',403);
  const key=postKey(permalink);
  let media:{id:string;permalink:string;comments_count?:number}|undefined;
  for await(const batch of pages<{id:string;permalink:string;comments_count?:number}>(`${account.id}/media`,token,{fields:'id,permalink,comments_count',limit:'100'})) {
    media=batch.find(m=>postKey(m.permalink)===key); if(media)break;
  }
  if(!media)throw new GiveawayError('La publicación no pertenece a la cuenta conectada.');
  const comments:Comment[]=[]; const ids=new Set<string>();
  const fields='id,text,timestamp,username,from';
  const add=(c:ApiComment,parentId?:string)=>{
    const handle=username(c.username||c.from?.username||'');
    if(!c.id||!handle)throw new GiveawayError('Meta devolvió un comentario sin identidad. No se guardó una lista parcial.',502);
    if(ids.has(c.id))return; ids.add(c.id);
    comments.push({id:c.id,username:handle,text:c.text||'',timestamp:c.timestamp||null,...(parentId?{parentId}:{})});
    if(comments.length>50000)throw new GiveawayError('La publicación supera 50.000 comentarios.');
  };
  for await(const batch of pages<ApiComment>(`${media.id}/comments`,token,{fields:`${fields},replies.limit(100){${fields}}`,limit:'100'})) {
    for(const c of batch){add(c); if(c.replies)for await(const replies of pages<ApiComment>(`${c.id}/replies`,token,{fields,limit:'100'},c.replies))for(const reply of replies)add(reply,c.id);}
  }
  if(!comments.length&&(media.comments_count||0)>0)throw new GiveawayError('Meta informa comentarios pero no permite leerlos. La lista anterior se conserva.',502);
  return {comments,mediaId:media.id,reportedCount:media.comments_count};
}

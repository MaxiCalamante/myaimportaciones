import { AdminFormError } from '@/lib/admin-action-result';
export class GiveawayError extends Error{constructor(message:string,public status=400){super(message);}}
export function checkOrigin(request:Request){
  // Compare the browser Origin with this exact hosting origin (also valid for previews).
  const expected=new URL(request.url).origin;
  if(request.headers.get('origin')!==expected)throw new GiveawayError('Origen de solicitud no autorizado.',403);
}
export async function body(request:Request){
  const reader=request.body?.getReader();if(!reader)throw new GiveawayError('Solicitud vacía.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000){await reader.cancel();throw new GiveawayError('El archivo supera 4 MB.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new GiveawayError('JSON inválido.');}
}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function fail(error:unknown){
  if(error instanceof AdminFormError)return response({error:error.message},error.message.includes('Iniciá sesión')?401:403);
  if(error instanceof GiveawayError)return response({error:error.message},error.status);
  return response({error:'No se pudo completar la operación. Revisá conexión y configuración del sorteo.'},500);
}

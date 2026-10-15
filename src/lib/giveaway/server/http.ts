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
  let parsed:unknown;
  try{parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new GiveawayError('JSON inválido.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new GiveawayError('Enviá un objeto JSON válido.');
  return parsed as Record<string,unknown> & {revision:number;action:string;roundId?:string;config:unknown;rules:unknown;reason?:string;kind?:string;checks:unknown;username?:string;confirmIdentity?:boolean;dataUrl?:string};
}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function fail(error:unknown){
  if(error instanceof AdminFormError)return response({error:error.message},error.message.includes('Iniciá sesión')?401:403);
  if(error instanceof GiveawayError)return response({error:error.message},error.status);
  return response({error:'No se pudo completar la operación. Revisá conexión y configuración del sorteo.'},500);
}

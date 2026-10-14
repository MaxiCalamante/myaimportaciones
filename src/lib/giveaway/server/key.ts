import { createHash } from 'node:crypto';
import type { Comment, Source } from '../types';
export type Dataset={id:string;comments:Comment[];source:Source};
export function secretKey(){
  const key=process.env.GIVEAWAY_AUDIT_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key||key.length<32)throw new Error('Falta la configuración privada del servidor para firmar el acta.');
  return createHash('sha256').update(`mya-giveaway-audit-v1:${key}`).digest();
}

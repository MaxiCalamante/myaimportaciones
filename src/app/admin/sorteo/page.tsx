import { INSTAGRAM_CONSOLE_SCRIPT } from '@/lib/giveaway/instagram-console-source';
import { GiveawayManager } from '@/components/giveaway/manager';
import { getAdminClient } from '@/lib/admin-auth';
import { privateState } from '@/lib/giveaway/server/data';
import { hasCommerceService } from '@/lib/supabase/service';
export const metadata={title:'Sorteo en vivo',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function AdminGiveawayPage(){
  await getAdminClient();let state=null,error='';
  try{if(!hasCommerceService())error='Falta la configuración privada del servidor.';else state=await privateState();}catch{error='Falta activar la migración del sorteo en Supabase, o no se pudo leer su configuración.';}
  return <GiveawayManager initial={state} setupError={error} consoleScript={INSTAGRAM_CONSOLE_SCRIPT}/>;
}

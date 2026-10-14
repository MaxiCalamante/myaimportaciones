import type { Metadata } from 'next';
import { LiveShow } from '@/components/giveaway/live-show';
import { publicState,unavailable } from '@/lib/giveaway/server/data';
export const dynamic='force-dynamic';
export const metadata:Metadata={robots:{index:false,follow:false},title:'Sorteo Día de la Madre en vivo',description:'Viví el sorteo Día de la Madre de MYA Importaciones. Domingo 18 de octubre, Día de la Madre. Horario a confirmar. Travel Kit SKIN1004 Centella, cuenta regresiva y resultado en vivo.',alternates:{canonical:'/sorteo'},openGraph:{title:'Un regalo para mamá · Sorteo MYA',description:'Viví el sorteo con MYA Importaciones. 18 de octubre de 2026.',url:'/sorteo',images:[{url:'/sorteo/dia-de-la-madre-instagram.jpg',width:1080,height:1350}]}};
export default async function GiveawayPage(){let state;try{state=await publicState();}catch{state=unavailable();}return <LiveShow initial={state}/>;}

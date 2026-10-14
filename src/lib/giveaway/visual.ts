import type { Comment, SourceKind } from './types';
export type Phase = 'idle' | 'countdown' | 'spinning' | 'winner';
export type Visual = { phase: Phase; countdown: number; progress: number; pool: Comment[]; winner?: Comment; source?: SourceKind; status?: string; reduceMotion: boolean; elapsed: number; avatar?: HTMLImageElement; avatars?:ReadonlyMap<string,HTMLImageElement>;phaseElapsed?:number;countdownProgress?:number; logo?: HTMLImageElement; portrait: boolean; participantCount?:number;scheduledFor?:string|null; title?:string; prize?:string };
const INK='#18333a',ROSE='#246973',GOLD='#a7dfe0',PAPER='#f6faf9',MUTED='#b4c9c9';
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color=PAPER,weight=500,max=900,serif=false){
  ctx.fillStyle=color;
  const font=(n:number)=>`${weight} ${n}px ${serif?'"Geist", "Segoe UI"':'"Geist", "Segoe UI"'}, sans-serif`;
  ctx.font=font(size);while(ctx.measureText(value).width>max&&size>13){size--;ctx.font=font(size);}ctx.fillText(value,x,y,max);
}
function box(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function spaced(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color=GOLD){
  ctx.font=`600 ${size}px "Geist", "Segoe UI", sans-serif`;ctx.fillStyle=color;const chars=[...value],gap=3.5,width=chars.reduce((n,c)=>n+ctx.measureText(c).width+gap,0)-gap;let left=x-width/2;
  for(const c of chars){ctx.fillText(c,left+ctx.measureText(c).width/2,y);left+=ctx.measureText(c).width+gap;}
}
function avatar(ctx:CanvasRenderingContext2D,c:Comment,x:number,y:number,r:number,image?:HTMLImageElement){
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#ecdaca';ctx.fillRect(x-r,y-r,r*2,r*2);
  if(image){const side=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,x-r,y-r,r*2,r*2);}
  else{const letters=(c.displayName||c.username.replace(/^(demo|fixture)\./,'')).replace(/[._]/g,' ').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();text(ctx,letters,x,y+r*.29,r*.72,ROSE,600,r*1.7);}
  ctx.restore();ctx.strokeStyle='#d4b48b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+8,0,Math.PI*2);ctx.stroke();
}
function confetti(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,reduce:boolean){
  const colors=['#b7dfdb','#e8c89c','#88b8bd','#f8eddc'];
  for(let i=0;i<64;i++){const x=(i*137.51)%w,speed=45+(i%7)*13,y=reduce?(i*173)%h:((t/1000*speed+i*173)%(h+100))-50;
    if(x>w*.17&&x<w*.83&&y>h*.3&&y<h*.77)continue;
    ctx.save();ctx.globalAlpha=.7*Math.max(0,1-Math.max(0,t-5000)/1500);ctx.translate(x+(!reduce?Math.sin(t*.001+i)*13:0),y);ctx.rotate(i+(!reduce?t*.0007:0));ctx.fillStyle=colors[i%4];ctx.fillRect(-3,-5,5+(i%3)*2,10);ctx.restore();
  }
}
export function renderStage(ctx:CanvasRenderingContext2D,w:number,h:number,v:Visual){
  ctx.save();ctx.clearRect(0,0,w,h);const portrait=v.portrait,W=portrait?1080:1920,H=portrait?1920:1080,cx=W/2;ctx.scale(w/W,h/H);ctx.textAlign='center';ctx.textBaseline='alphabetic';
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#123b43');bg.addColorStop(.62,'#19454b');bg.addColorStop(1,'#102d34');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(226,196,154,.24)';ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect(26,26,W-52,H-52,28);ctx.stroke();
  if(v.logo){const lw=portrait?170:140,lh=lw*v.logo.height/v.logo.width;ctx.drawImage(v.logo,cx-lw/2,portrait?86:38,lw,lh);}
  spaced(ctx,'MYA IMPORTACIONES',cx,portrait?230:133,portrait?23:19);
  if(v.title&&v.title!=='SORTEO DÍA DE LA MADRE'){text(ctx,v.title,cx,portrait?378:252,portrait?75:65,PAPER,400,portrait?920:1450,true);}
  else{text(ctx,'Sorteo Día',cx,portrait?350:228,portrait?83:72,PAPER,400,1500,true);text(ctx,'de la Madre',cx,portrait?442:309,portrait?83:72,PAPER,400,1500,true);}
  const pillY=portrait?492:343,count=(v.participantCount??v.pool.length).toLocaleString('es-AR');
  box(ctx,cx-164,pillY,328,47,23,'rgba(244,228,203,.08)');text(ctx,v.source==='demo'?`${count} cuentas de ejemplo`:`${count} participantes`,cx,pillY+31,portrait?20:19,'#f0dbc0',500);
  const main=portrait?930:643;
  if(v.phase==='idle'){
    const dw=portrait?470:410,dh=portrait?350:254;
    box(ctx,cx-dw/2,main-dh/2,dw,dh,24,'rgba(220,243,238,.07)');
    spaced(ctx,'DOMINGO · OCTUBRE',cx,main-(portrait?108:77),portrait?24:20);
    text(ctx,'18',cx,main+(portrait?88:64),portrait?220:168,PAPER,550,dw);
    text(ctx,'DÍA DE LA MADRE',cx,main+(portrait?142:101),portrait?24:19,GOLD,600,dw);
    text(ctx,'Nos encontramos acá.',cx,main+(portrait?270:205),portrait?42:33,PAPER,500,portrait?910:1400);
    text(ctx,v.scheduledFor?'En vivo a las '+new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}).format(new Date(v.scheduledFor))+' h · Argentina':'El horario se anuncia próximamente.',cx,main+(portrait?331:250),portrait?27:22,MUTED,400);

  }else if(v.phase==='countdown'){
    const r=portrait?181:116;ctx.strokeStyle='rgba(232,209,173,.18)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,main,r,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=GOLD;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,main,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.01,v.countdownProgress??(5-v.countdown)/5));ctx.stroke();
    text(ctx,String(v.countdown),cx,main+(portrait?70:48),portrait?224:149,PAPER,400,600,true);spaced(ctx,'COMENZAMOS EN',cx,main+(portrait?277:175),portrait?21:18);
  }else if(v.phase==='spinning'&&v.reduceMotion){
    text(ctx,'Seleccionando una cuenta…',cx,main,portrait?47:39,PAPER,400,portrait?900:1400,true);text(ctx,'Una oportunidad por cuenta.',cx,main+73,portrait?26:22,MUTED,400);
  }else if(v.phase==='spinning'){
    const slot=portrait?144:105,aw=portrait?900:1390,ah=slot*3.15,target=96,t=Math.min(v.progress,.999),travel=t<.16?.24*Math.pow(t/.16,2):.24+.76*(1-Math.pow(1-(t-.16)/.84,3)),position=target*travel,floor=Math.floor(position),frac=position-floor;
    box(ctx,cx-aw/2,main-ah/2,aw,ah,24,'#f3f8f6');
    ctx.save();ctx.beginPath();ctx.roundRect(cx-aw/2,main-ah/2,aw,ah,24);ctx.clip();
    box(ctx,cx-aw/2+13,main-slot/2+5,aw-26,slot-10,14,'#dcecea');
    for(let offset=-2;offset<=3;offset++){const index=floor+offset,c=index>=target&&v.winner?v.winner:v.pool[Math.max(0,index)%v.pool.length];if(!c)continue;const y=main+(offset-frac)*slot;ctx.globalAlpha=Math.max(.15,1-Math.abs(offset-frac)*.47);avatar(ctx,c,cx-aw/2+92,y,portrait?40:34,v.avatars?.get(c.username));text(ctx,`@${c.username}`,cx+46,y+(c.displayName?-1:13),portrait?41:39,INK,600,aw-280);if(c.displayName)text(ctx,c.displayName,cx+46,y+35,portrait?23:21,'#526b6e',400,aw-280);}
    const fade=ctx.createLinearGradient(0,main-ah/2,0,main+ah/2);fade.addColorStop(0,'#f3f8f6');fade.addColorStop(.3,'#f3f8f600');fade.addColorStop(.7,'#f3f8f600');fade.addColorStop(1,'#f3f8f6');ctx.fillStyle=fade;ctx.fillRect(cx-aw/2,main-ah/2,aw,ah);
    ctx.restore();ctx.strokeStyle='#80b6b3';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-aw/2+13,main-slot/2+5,aw-26,slot-10,14);ctx.stroke();
    text(ctx,'Una oportunidad por cuenta.',cx,main+ah/2+66,portrait?27:23,MUTED,400);
  }else if(v.winner){
    const enter=v.reduceMotion?1:1-Math.pow(1-Math.min(1,(v.phaseElapsed??1000)/650),3);ctx.save();ctx.globalAlpha=enter;ctx.translate(0,(1-enter)*30);
    const top=portrait?667:451,cw=portrait?904:1420,ch=portrait?755:415;
    box(ctx,cx-cw/2,top,cw,ch,30,'#fff9ee');ctx.strokeStyle='#d8bd98';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(cx-cw/2+13,top+13,cw-26,ch-26,21);ctx.stroke();
    spaced(ctx,'¡TENEMOS GANADOR!',cx,top+(portrait?89:53),portrait?24:21,ROSE);
    avatar(ctx,v.winner,cx,portrait?927:598,portrait?122:74,v.avatar);
    text(ctx,`@${v.winner.username}`,cx,portrait?1130:726,portrait?64:56,ROSE,650,portrait?815:1280);
    if(v.winner.displayName)text(ctx,v.winner.displayName,cx,portrait?1193:772,portrait?28:23,'#796356',400,portrait?820:1300);
    const snippet=v.winner.text.length>100?v.winner.text.slice(0,97)+'…':v.winner.text;
    wrapText(ctx,snippet?`“${snippet}”`:'Participación importada',cx,portrait?1274:804,portrait?745:1240,portrait?27:21,portrait?39:28,portrait?2:1,'#796356');
    text(ctx,v.status==='confirmed'?'Condiciones revisadas por MYA':'Pendiente de revisión de las condiciones',cx,portrait?1500:922,portrait?24:20,MUTED,400,portrait?880:1450);
    ctx.restore();if(!v.reduceMotion&&(v.phaseElapsed??v.elapsed)<6500)confetti(ctx,W,H,v.phaseElapsed??v.elapsed,false);
  }
  const footer=portrait?1618:980;ctx.strokeStyle='rgba(226,196,154,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-150,footer-42);ctx.lineTo(cx+150,footer-42);ctx.stroke();spaced(ctx,'EL REGALO DE MYA',cx,footer,portrait?20:16);
  text(ctx,v.prize||'Travel Kit SKIN1004 Centella',cx,footer+(portrait?66:47),portrait?39:29,PAPER,400,portrait?910:1500,true);
  if(portrait)text(ctx,'18 DE OCTUBRE DE 2026 · @_myaimportaciones',cx,1805,20,MUTED,400,900);
  if(v.source==='demo'){box(ctx,portrait?250:W-400,portrait?1835:35,portrait?580:350,43,21,'#f2ddbe');text(ctx,'ENSAYO PRIVADO · SIN VALIDEZ',portrait?540:W-225,portrait?1864:64,portrait?18:16,'#5c4731',600,portrait?550:330);}
  ctx.restore();
}
export function wrapText(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,size:number,lineHeight:number,maxLines:number,color='#796356'){
  ctx.font=`400 ${size}px "Geist", "Segoe UI", sans-serif`;const words=value.split(/\s+/),lines:string[]=[];let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);lines.slice(0,maxLines).forEach((v,i)=>text(ctx,v+(i===maxLines-1&&lines.length>maxLines?'…':''),x,y+i*lineHeight,size,color,400,width));
}

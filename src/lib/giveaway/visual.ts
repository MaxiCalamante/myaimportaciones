import type { Comment, SourceKind } from './types';
export type Phase = 'idle' | 'countdown' | 'spinning' | 'winner';
export type Visual = { phase: Phase; countdown: number; progress: number; pool: Comment[]; winner?: Comment; source?: SourceKind; status?: string; reduceMotion: boolean; elapsed: number; avatar?: HTMLImageElement; logo?: HTMLImageElement; portrait: boolean; participantCount?:number; title?:string; prize?:string };
const ROSE = '#993b5e', INK = '#412d34', GOLD = '#af8959';
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = INK, weight = 500, max = 900) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Geist", "Segoe UI", sans-serif`;
  while (ctx.measureText(value).width > max && size > 13) { size -= 1; ctx.font = `${weight} ${size}px "Geist", "Segoe UI", sans-serif`; }
  ctx.fillText(value,x,y,max);
}
function roundRect(ctx: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string) { ctx.fillStyle=fill; ctx.beginPath(); ctx.roundRect(x,y,w,h,r);ctx.fill(); }
function spaced(ctx: CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color=GOLD) {
  ctx.font=`500 ${size}px "Geist", "Segoe UI", sans-serif`;ctx.fillStyle=color;
  const chars=[...value], gap=4, width=chars.reduce((sum,c)=>sum+ctx.measureText(c).width+gap,0)-gap;
  let left=x-width/2;for(const c of chars) {ctx.fillText(c,left+ctx.measureText(c).width/2,y);left+=ctx.measureText(c).width+gap;}
}
function avatar(ctx: CanvasRenderingContext2D,c:Comment,x:number,y:number,r:number,image?:HTMLImageElement) {
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#f4e1e5';ctx.fillRect(x-r,y-r,r*2,r*2);
  if(image) { const side=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,x-r,y-r,r*2,r*2); }
  else { const initials=(c.displayName || c.username.replace(/^demo\./,'')).replace(/[_\.]/g,' ').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase(); text(ctx,initials,x,y+r*.3,r*.8,ROSE,500,r*1.7); }
  ctx.restore();
  ctx.strokeStyle='#cda587';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+8,0,Math.PI*2);ctx.stroke();
}
function flowers(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,moving:boolean) {
  for(let i=0;i<7;i++) { const x=i%2 ? w+65 : -35, y=h*(.18+i*.125), r=85+i*14;
    ctx.save();ctx.translate(x,y);ctx.rotate(i*.8+(moving?Math.sin(t*.00016+i)*.15:0));
    ctx.strokeStyle='rgba(164,110,123,.16)';ctx.lineWidth=1.5;
    for(let p=0;p<6;p++) {ctx.rotate(Math.PI/3);ctx.beginPath();ctx.ellipse(r*.72,0,r,r*.4,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore(); }
}
function confetti(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,reduce:boolean) {
  const colors=['#ba8092','#d9b47b','#f0ced5','#fffef9'];
  for(let i=0;i<85;i++) {
    const x=((i*137.51)%w), speed=55+(i%7)*17;
    const y=reduce ? (i*173)%h : ((t/1000*speed+i*173)%(h+100))-50;
    ctx.save();ctx.translate(x+(!reduce?Math.sin(t*.001+i)*20:0),y);ctx.rotate(i+(!reduce?t*.001:0));ctx.fillStyle=colors[i%4];ctx.fillRect(-4,-8,8+(i%3)*3,16);ctx.restore();
  }
}
export function renderStage(ctx:CanvasRenderingContext2D,w:number,h:number,v:Visual) {
  ctx.save();ctx.clearRect(0,0,w,h);
  const portrait=v.portrait;
  // Coordenadas lógicas compartidas; exportar PNG usa siempre 1080 × 1920.
  const W=portrait?1080:1920,H=portrait?1920:1080;ctx.scale(w/W,h/H);
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#fffdf7');bg.addColorStop(.5,'#faeff0');bg.addColorStop(1,'#ecd7dd');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  flowers(ctx,W,H,v.elapsed,!v.reduceMotion);
  const cx=W/2, top=portrait?180:85, main=portrait?850:640;
  ctx.textAlign='center';ctx.textBaseline='alphabetic';
  if(v.logo) {const width=portrait?230:160,height=width*v.logo.height/v.logo.width;ctx.drawImage(v.logo,cx-width/2,top-height/2,width,height);}
  text(ctx,'MYA IMPORTACIONES',cx,top+(portrait?112:75),portrait?25:20,INK,600);
  spaced(ctx,'UN REGALO PARA MAMÁ',cx,top+(portrait?197:126),portrait?23:18);
  if(v.title&&v.title!=='SORTEO DÍA DE LA MADRE'){text(ctx,v.title,cx,top+(portrait?330:233),portrait?75:60,INK,600,portrait?900:1500);}
  else{text(ctx,'SORTEO DÍA',cx,top+(portrait?292:195),portrait?82:67,INK,600);text(ctx,'DE LA MADRE',cx,top+(portrait?386:267),portrait?82:67,INK,600);}
  const pillY=top+(portrait?436:291);
  roundRect(ctx,cx-157,pillY,314,51,25,'rgba(255,255,255,.72)');
  text(ctx,`${(v.participantCount??v.pool.length).toLocaleString('es-AR')} participantes`,cx,pillY+34,22,ROSE,500);
  if(v.phase==='idle') {
    ctx.strokeStyle='#c3a188';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,main,portrait?112:67,0,Math.PI*2);ctx.stroke();
    text(ctx,'✦',cx,main+(portrait?34:22),portrait?92:58,GOLD,400);
    text(ctx,(v.participantCount??v.pool.length)?'Todo listo para la magia':'Un regalo. Muchas ilusiones.',cx,main+(portrait?204:125),portrait?36:28,INK,500);
    text(ctx,'Una cuenta, una oportunidad.',cx,main+(portrait?263:170),portrait?27:22,'#886e76',400);
  } else if(v.phase==='countdown') {
    ctx.strokeStyle='#cfa8b5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,main,portrait?182:110,0,Math.PI*2);ctx.stroke();
    text(ctx,String(v.countdown),cx,main+(portrait?69:46),portrait?220:145,ROSE,400);
    spaced(ctx,'LA SUERTE ESTÁ POR LLEGAR',cx,main+(portrait?269:167),portrait?23:19,ROSE);
  } else if(v.phase==='spinning' && v.reduceMotion) {
    text(ctx,'Eligiendo un momento especial…',cx,main,portrait?38:32,ROSE,500);
    text(ctx,'Selección segura. Una oportunidad por cuenta.',cx,main+70,portrait?25:22,'#886e76',400);
  } else if(v.phase==='spinning') {
    const slot=portrait?149:110, areaW=portrait?890:1100, areaH=slot*3.1;
    const target=96, position=target*(1-Math.pow(1-Math.min(v.progress,v.winner?1:.94),5));
    const floor=Math.floor(position), frac=position-floor;
    roundRect(ctx,cx-areaW/2,main-areaH/2,areaW,areaH,38,'rgba(255,255,255,.65)');
    ctx.save();ctx.beginPath();ctx.roundRect(cx-areaW/2,main-areaH/2,areaW,areaH,38);ctx.clip();
    for(let offset=-2;offset<=3;offset++) {
      const index=floor+offset;
      const c=index>=target&&v.winner?v.winner:v.pool[((Math.max(0,index)*17)+index%3)%v.pool.length];
      if(!c)continue;
      const y=main+(offset-frac)*slot, distance=Math.abs(offset-frac);
      ctx.globalAlpha=Math.max(.14,1-distance*.45);avatar(ctx,c,cx-areaW/2+95,y,portrait?39:31);
      text(ctx,`@${c.username}`,cx+34,y+13,portrait?41:36,INK,600,areaW-255);
    }
    ctx.restore();ctx.strokeStyle=ROSE;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-areaW/2,main-slot/2,areaW,slot,26);ctx.stroke();
    text(ctx,'Cada cuenta tiene la misma oportunidad',cx,main+areaH/2+65,portrait?25:21,'#886e76',400);
  } else if(v.winner) {
    const winner=v.winner, center=portrait?920:625;
    roundRect(ctx,cx-(portrait?453:670),center-(portrait?243:184),portrait?906:1340,portrait?640:420,40,'rgba(255,255,255,.8)');
    spaced(ctx,'¡TENEMOS GANADOR!',cx,center-(portrait?166:120),portrait?31:26,ROSE);
    avatar(ctx,winner,cx,center-(portrait?10:8),portrait?100:64,v.avatar);
    text(ctx,`@${winner.username}`,cx,center+(portrait?183:116),portrait?58:49,ROSE,600,portrait?816:1180);
    if(winner.displayName)text(ctx,winner.displayName,cx,center+(portrait?237:162),portrait?29:25,'#886e76',400);
    const snippet=winner.text.length>110?winner.text.slice(0,107)+'…':winner.text;
    wrapText(ctx,snippet?`“${snippet}”`:'Participación importada sin comentario',cx,center+(portrait?304:202),portrait?720:1100,portrait?29:24,portrait?38:30,2);
    if(portrait)text(ctx,v.status==='confirmed'?'Condiciones revisadas por MYA':'Condiciones pendientes de revisión manual',cx,center+457,21,'#886e76',400);
    confetti(ctx,W,H,v.elapsed,v.reduceMotion);
  }
  const footer=portrait?1585:934;
  ctx.strokeStyle='rgba(175,137,89,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-180,footer-50);ctx.lineTo(cx+180,footer-50);ctx.stroke();
  spaced(ctx,'EL PREMIO',cx,footer,portrait?23:17);
  text(ctx,v.prize||'Travel Kit SKIN1004 Centella',cx,footer+(portrait?69:42),portrait?43:31,INK,500);
  text(ctx,'18 DE OCTUBRE DE 2026 · @_myaimportaciones',cx,portrait?1811:1050,portrait?21:16,'#886e76',400);
  if(v.source==='demo') { roundRect(ctx,32,32,portrait?485:355,49,24,'#993b5e');text(ctx,'DEMOSTRACIÓN · SIN VALIDEZ',portrait?274:210,65,portrait?22:17,'#fff',600); }
  else if(v.source) { text(ctx,v.source==='instagram'?'DATOS DE META':'DATOS IMPORTADOS',cx,portrait?1865:1080-8,portrait?19:14,'#886e76',500); }
  ctx.restore();
}
export function wrapText(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,size:number,lineHeight:number,maxLines:number) {
  ctx.font=`400 ${size}px "Geist", "Segoe UI", sans-serif`;ctx.fillStyle='#886e76';
  const words=value.split(/\s+/),lines:string[]=[];let line='';
  for(const word of words) { const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>width&&line) {lines.push(line);line=word;}else line=test; }
  if(line)lines.push(line);
  lines.slice(0,maxLines).forEach((l,i)=>text(ctx,l+(i===maxLines-1&&lines.length>maxLines?'…':''),x,y+i*lineHeight,size,'#886e76',400,width));
}

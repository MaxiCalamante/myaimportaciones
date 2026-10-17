import type { Comment } from './types';
import { reelPosition } from './experience';

type ReelVisual={pool:Comment[];winner?:Comment;progress:number;reduceMotion:boolean;avatars:ReadonlyMap<string,HTMLImageElement>};
export function renderParticipantReel(ctx:CanvasRenderingContext2D,w:number,h:number,v:ReelVisual){
  ctx.save();ctx.textAlign='center';
  const center=w/2,cy=h*.46,r=Math.min(h*.26,w*.13),spacing=r*2.45;
  const position=reelPosition(v.progress),base=Math.floor(position),fraction=position-base;
  const glow=ctx.createRadialGradient(center,cy,r*.5,center,cy,r*2.2);glow.addColorStop(0,'rgba(224,189,119,.20)');glow.addColorStop(1,'rgba(224,189,119,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  if(!v.pool.length&&!v.winner){ctx.fillStyle='#f0e4cc';ctx.font=`400 ${Math.max(15,w*.022)}px Georgia,serif`;ctx.fillText('Preparando las cuentas participantes…',center,cy,w-28);ctx.restore();return;}
  const offsets=v.reduceMotion?[0]:[-4,-3,-2,-1,0,1,2,3,4];
  for(const offset of offsets){
    const distance=v.reduceMotion?0:offset-fraction,x=center+distance*spacing;
    if(x<-r||x>w+r)continue;
    const index=base+offset,isFinal=v.progress>=1&&Math.abs(distance)<.01&&Boolean(v.winner);
    const c=isFinal?v.winner:v.reduceMotion?v.pool[0]:v.pool[((index%v.pool.length)+v.pool.length)%v.pool.length];if(!c)continue;
    const prominence=Math.max(0,1-Math.abs(distance)),radius=r*(.64+.36*prominence);
    ctx.globalAlpha=Math.max(.18,1-Math.abs(distance)*.22);
    ctx.save();ctx.beginPath();ctx.arc(x,cy,radius,0,Math.PI*2);ctx.clip();ctx.fillStyle='#dce6dc';ctx.fillRect(x-radius,cy-radius,radius*2,radius*2);
    const image=v.avatars.get(c.username);
    if(image){const side=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,x-radius,cy-radius,radius*2,radius*2);}
    else{ctx.fillStyle='#173f41';ctx.font=`500 ${radius*.58}px "Geist","Segoe UI",sans-serif`;const letters=(c.displayName||c.username).replace(/[._]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();ctx.fillText(letters,x,cy+radius*.2);}
    ctx.restore();ctx.strokeStyle=prominence>.7?'#eed09a':'rgba(221,199,155,.35)';ctx.lineWidth=prominence>.7?3:1;ctx.beginPath();ctx.arc(x,cy,radius+4,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=1;ctx.strokeStyle='#e4bd7d';ctx.lineWidth=1;ctx.beginPath();ctx.arc(center,cy,r+9,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#e4bd7d';for(let i=0;i<6;i++){const angle=i*Math.PI/3+.2,x=center+Math.cos(angle)*(r+23),y=cy+Math.sin(angle)*(r+23);ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y-5);ctx.lineTo(x+3,y);ctx.lineTo(x,y+5);ctx.closePath();ctx.fill();}
  const nearest=v.progress>=1&&v.winner?v.winner:v.reduceMotion?v.pool[0]:v.pool[((Math.round(position)%v.pool.length)+v.pool.length)%v.pool.length];
  if(nearest){ctx.fillStyle='#f3dfba';ctx.font=`600 ${Math.max(12,Math.min(19,w*.025))}px "Geist","Segoe UI",sans-serif`;ctx.fillText(`@${nearest.username}`,center,cy+r+26,w*.8);}
  ctx.fillStyle='#fff9ec';ctx.font=`400 ${Math.max(11,Math.min(17,w*.024))}px "Geist","Segoe UI",sans-serif`;
  const message=v.progress>=1&&v.winner?'Cuenta seleccionada en el servidor':v.progress>=1?'Sincronizando el resultado…':v.reduceMotion?'Selección en curso…':'Seleccionando una cuenta válida…';
  ctx.fillText(message,center,h*.96,w-24);ctx.restore();
}

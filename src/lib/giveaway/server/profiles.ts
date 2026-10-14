import type { Comment } from '../types';
function decode(s:string){return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
export function publicProfile(html:string,handle:string){
  const tags=[...html.matchAll(/<meta\s[^>]+>/gi)].map(m=>m[0]);
  const meta=(key:string)=>{const t=tags.find(t=>t.includes(`property="${key}"`));return t?decode(t.match(/content="([^"]*)"/)?.[1]||''):'';};
  const canonical=meta('og:url'),title=meta('og:title'),photo=meta('og:image');
  try{const u=new URL(canonical);if(u.hostname!=='www.instagram.com'||u.pathname.replace(/\/$/,'')!==`/${handle}`)return null;}catch{return null;}
  const marker=`(@${handle})`; if(!title.includes(marker))return null;
  const displayName=title.slice(0,title.indexOf(marker)).trim().slice(0,150);
  let avatar:string|undefined;
  try{const u=new URL(photo);if(u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='scontent.cdninstagram.com'||u.hostname.endsWith('.cdninstagram.com')||u.hostname.endsWith('.fbcdn.net')))avatar=u.href;}catch{}
  return {username:handle,...(displayName?{displayName}:{}),...(avatar?{avatar}:{})};
}
export async function readProfile(handle:string){
  try{
    const r=await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`,{redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
    if(!r.ok||!r.body){console.info('[giveaway-profile]',{status:r.status});return null;}
    const reader=r.body.getReader();let html='',bytes=0;const decoder=new TextDecoder();
    try{while(bytes<180000){const {done,value}=await reader.read();if(done)break;bytes+=value.length;html+=decoder.decode(value,{stream:true});if(html.includes('</head>'))break;}}finally{await reader.cancel();}
    const profile=publicProfile(html,handle);if(!profile)console.info('[giveaway-profile]',{status:r.status,bytes,hasTitle:html.includes('og:title'),hasImage:html.includes('og:image'),hasUrl:html.includes('og:url'),headComplete:html.includes('</head>')});return profile;
  }catch(e){console.info('[giveaway-profile]',{error:e instanceof Error?e.name:'unknown'});return null;}
}
export async function enrichProfiles(comments:Comment[],previous:Comment[]=[]){
  const cached=new Map(previous.filter(c=>c.avatar||c.displayName).map(c=>[c.username,c]));
  const handles=[...new Set(comments.map(c=>c.username))].filter(h=>!cached.has(h));
  let index=0;
  await Promise.all(Array.from({length:3},async()=>{while(index<handles.length){const h=handles[index++];const p=await readProfile(h);if(p)cached.set(h,{id:'profile',text:'',timestamp:null,...p});}}));
  return comments.map(c=>{const p=cached.get(c.username);return {...c,...(p?.displayName?{displayName:p.displayName}:{}),...(p?.avatar?{avatar:p.avatar}:{})};});
}

export const INSTAGRAM_CONSOLE_SCRIPT = String.raw`/* MYA: comentarios renderizados en la publicación abierta. Sin cookies, tokens ni API privada. */
(() => {
  'use strict';
  if (!/^(www\.)?instagram\.com$/.test(location.hostname) || !/^\/(?:p|reel)\/[\w-]+\/?$/.test(location.pathname)) {
    alert('Abrí la publicación de Instagram en su propia pestaña antes de ejecutar el script.'); return;
  }
  window.MYAComentarios?.detener();
  const postUrl = location.origin + location.pathname;
  const postPath = location.pathname.replace(/\/$/, '');
  const comments = new Map();
  let active = true, automatic = false, timer;
  const panel = document.createElement('aside');
  panel.id = 'mya-exportador';
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(350px,calc(100vw - 32px));padding:18px;background:white;color:#412d34;border:2px solid #993b5e;border-radius:16px;font:14px/1.5 system-ui;box-shadow:0 8px 35px #0003';
  const heading = document.createElement('strong'); heading.textContent = 'MYA · Exportar comentarios'; panel.append(heading);
  const status = document.createElement('p'); status.setAttribute('aria-live','polite'); panel.append(status);
  const note = document.createElement('p'); note.textContent = 'Captura lo que Instagram carga. Nombre completo solo si está visible. No certifica que estén todos los comentarios ni las respuestas.'; panel.append(note);
  const countLabel = document.createElement('label'); countLabel.textContent = 'Total de comentarios que Instagram indica (opcional)';
  const countInput = document.createElement('input'); countInput.type = 'number'; countInput.min = '0'; countInput.max = '1000000'; countInput.style.cssText='display:block;width:100%;box-sizing:border-box;margin:6px 0 12px'; countLabel.append(countInput); panel.append(countLabel);
  function profile(a) {
    try { const u = new URL(a.getAttribute('href'),location.origin); const m = /^\/([a-zA-Z0-9._]{1,30})\/?$/.exec(u.pathname);
      return u.hostname === location.hostname && m && !['p','reel','accounts','explore','direct'].includes(m[1]) ? m[1].toLowerCase() : null;
    } catch { return null; }
  }
  function safePhoto(src) {
    try { const u = new URL(src); return u.protocol==='https:' && !u.username && !u.password && (!u.port || u.port==='443') && /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(u.hostname) ? u.href : ''; } catch { return ''; }
  }
  function collect() {
    if (!active) return;
    if (location.pathname.replace(/\/$/, '') !== postPath) { stop(); status.textContent='Cambiaste de publicación. Ejecutá otra vez el script en la publicación correcta.'; return; }
    for (const link of document.querySelectorAll('a[href*="/c/"]')) {
      let url; try { url=new URL(link.getAttribute('href'),location.origin); } catch { continue; }
      const match = /^(\/(?:p|reel)\/[\w-]+)\/c\/(\d+)\/?$/.exec(url.pathname);
      if (!match || match[1]!==postPath) continue;
      let header=link.parentElement,author=null;
      for(let depth=0;header && depth<10;depth++,header=header.parentElement){
        author=[...header.querySelectorAll('a[href]')].find(a=>profile(a) && a.textContent.trim() && !a.textContent.trim().startsWith('@'));
        if(author)break;
      }
      const user=author && profile(author); if(!user || !header)continue;
      let card=header;
      for(let depth=0;card && depth<12;depth++,card=card.parentElement){
        if([...card.querySelectorAll('a[href]')].some(a=>profile(a)===user && a.querySelector('img')))break;
      }
      if(!card)card=header;
      // The time/author row and comment body are siblings in Instagram's current layout.
      const body=header?.nextElementSibling;
      if(!body || body.querySelector('a[href*="/c/"]') || body.matches('button,[role="button"]')) continue;
      const clone=body.cloneNode(true);
      clone.querySelectorAll('button,[role="button"],time').forEach(e=>e.remove());
      clone.querySelectorAll('img[alt]').forEach(e=>e.replaceWith(document.createTextNode(e.alt)));
      const text=clone.textContent.trim();
      if(!text || /^(Me gusta|Responder|Like|Reply)$/i.test(text)) continue;
      const photoLink=[...card.querySelectorAll('a[href]')].find(a=>profile(a)===user && a.querySelector('img'));
      const image=photoLink?.querySelector('img');
      const visibleName=author?.getAttribute('title')?.trim() || '';
      const name=visibleName && visibleName.toLowerCase()!==user && !/^(@|foto del perfil|profile picture)/i.test(visibleName) ? visibleName : '';
      const timestamp=link.querySelector('time[datetime]')?.getAttribute('datetime') || null;
      const item={id:match[2],username:user,text,timestamp};
      if(name) item.displayName=name;
      const avatar=safePhoto(image?.currentSrc || image?.getAttribute('src') || ''); if(avatar) item.avatar=avatar;
      // Keep the photo/name already captured if Instagram later unloads that part of the card.
      comments.set(item.id,{...comments.get(item.id),...item});
    }
    const rows=[...comments.values()];
    status.textContent=rows.length+' comentarios · '+new Set(rows.map(c=>c.username)).size+' cuentas · '+rows.filter(c=>c.avatar).length+' fotos · '+rows.filter(c=>c.displayName).length+' nombres completos'+(automatic?' · cargando…':'');
  }
  function data() {
    collect();
    const value=countInput.value.trim();
    const reportedCount=value && /^\d+$/.test(value) && Number(value)<=1000000 ? Number(value) : null;
    return {format:'mya-instagram-comments',version:1,postUrl,exportedAt:new Date().toISOString(),coverage:'loaded-comments-only',reportedCount,comments:[...comments.values()]};
  }
  function json() { return JSON.stringify(data(),null,2); }
  function button(label, action) {
    const b=document.createElement('button'); b.type='button'; b.textContent=label; b.style.cssText='padding:9px;margin:4px 4px 0 0;border:1px solid #993b5e;border-radius:8px;background:#fff;color:#7d2f4d;cursor:pointer';
    b.addEventListener('click',action); panel.append(b); return b;
  }
  async function copyJson() {
    if(!comments.size){status.textContent='Todavía no se detectaron comentarios. Cargalos en Instagram.';return;}
    const text=json();
    try { await navigator.clipboard.writeText(text); status.textContent='JSON copiado. Pegalo en Admin → Importar de Instagram.'; }
    catch { const area=document.createElement('textarea');area.value=text;area.style.cssText='width:100%;height:140px';area.setAttribute('aria-label','JSON para copiar');panel.append(area);area.select();status.textContent='Copiá el texto seleccionado con Ctrl+C.'; }
  }
  function download() {
    if(!comments.size){status.textContent='No hay comentarios para descargar.';return;}
    const href=URL.createObjectURL(new Blob([json()],{type:'application/json'})),a=document.createElement('a');
    a.href=href;a.download='mya-comentarios-instagram-'+postPath.split('/').pop()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),5000);
  }
  function loginRequired() {
    const login=[...document.querySelectorAll('button,[role="button"]')].find(b=>!panel.contains(b) && b.getClientRects().length && /^(Iniciar sesión|Log in)$/i.test((b.textContent || '').trim()));
    if(!login)return false;
    for(let card=login.parentElement,depth=0;card && depth<8;card=card.parentElement,depth++) {
      if(/Ve todos los comentarios|Ver todos los comentarios|See all comments|Log in to see more comments/i.test(card.innerText || ''))return true;
      if(card.matches('[role="dialog"]'))return true;
    }
    return false;
  }
  const loadButton=button('Cargar comentarios',async()=>{
    if(automatic) return; automatic=true; loadButton.disabled=true;
    let blockedByLogin=false;
    // Only native "load comments" controls; no likes, follow actions, replies or private endpoints.
    for(let n=0;active && automatic && n<120;n++){
      collect();
      if(loginRequired()){blockedByLogin=true;break;}
      const candidates=[...document.querySelectorAll('button,[role="button"]')].filter(b=>!panel.contains(b));
      const next=candidates.find(b=>/^(Cargar más comentarios|Load more comments|View more comments)$/i.test((b.getAttribute('aria-label') || b.textContent || b.querySelector('svg title')?.textContent || '').trim()) && !b.disabled);
      if(!next)break;
      next.click();await new Promise(resolve=>setTimeout(resolve,2500));
    }
    automatic=false;loadButton.disabled=false;collect();
    note.textContent=blockedByLogin?'Instagram pide iniciar sesión para ver más comentarios. La carga se detuvo y conserva la muestra. Iniciá sesión y volvé a pulsar Cargar comentarios. Esta lista todavía no está completa.':'Carga automática detenida. Revisá el post: desplazate y abrí las respuestas que deban participar. Después copiá el JSON. Un contador quieto no demuestra que estén todos.';
  });
  button('Copiar JSON',copyJson);button('Descargar JSON',download);button('Detener carga',()=>{automatic=false;collect();});
  function stop(){active=false;automatic=false;clearTimeout(timer);observer.disconnect();panel.remove();}
  button('Cerrar',stop);
  const observer=new MutationObserver(changes=>{if(changes.every(change=>panel.contains(change.target)))return;clearTimeout(timer);timer=setTimeout(collect,250);});
  document.body.append(panel);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','href']});
  window.MYAComentarios={capturar:collect,json,copiar:copyJson,descargar:download,detener:stop};
  collect();
  console.info('MYA: recolección activa. Cargá comentarios y respuestas; copiá el JSON desde el panel. No lee credenciales ni envía el archivo a ningún servidor.');
})();`;

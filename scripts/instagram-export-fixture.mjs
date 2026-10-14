// Entire Instagram surface is synthetic and all requests are fulfilled locally.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const stamp='2026-10-14T12:00:00.000Z';
const photo='https://scontent.cdninstagram.com/v/fixture.jpg';
const comment=(id,user,name,text)=>'<section><a href="/'+user+'/"><img alt="Foto del perfil" src="'+photo+'"></a><div><div><a href="/'+user+'/" title="'+name+'">'+user+'</a><a href="/p/DeIpHXtkYyf/c/'+id+'/"><time datetime="'+stamp+'">1 h</time></a></div><div>'+text+'</div><button>Me gusta</button><button>Responder</button></div></section>';
export async function consoleFixture(browser) {
  const context=await browser.newContext();
  await context.route('**/*',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<html><head><meta charset="utf-8"></head><body><article>'+comment('179001','fixture.alma','Alma de prueba','Hola, @fixture.amiga')+comment('179002','fixture.flor','Flor de prueba','Con @fixture.amiga')+'</article><button id="load">Cargar más comentarios</button><script>document.querySelector("#load").onclick=()=>{document.querySelector("article").insertAdjacentHTML("beforeend",'+JSON.stringify(comment('179003','fixture.alma','Alma de prueba','Otra @fixture.amiga')+comment('179004','_myaimportaciones','MYA de prueba','Con @fixture.amiga'))+');document.querySelector("#load").remove();};</script></body></html>'}));
  try {
    const page=await context.newPage();const failures=[];page.on('pageerror',e=>failures.push(e.message));
    await page.goto('https://www.instagram.com/p/DeIpHXtkYyf/');
    await page.addScriptTag({content:await readFile('docs/sorteos/exportar-instagram.js','utf8')});
    let value=await page.evaluate(()=>JSON.parse(window.MYAComentarios.json()));assert.equal(value.comments.length,2);assert.equal(value.comments[0].displayName,'Alma de prueba');assert.equal(value.comments[0].text,'Hola, @fixture.amiga');assert.equal(value.comments[0].avatar,photo);
    await page.getByRole('button',{name:'Cargar comentarios',exact:true}).click();
    try { await page.waitForFunction(()=>JSON.parse(window.MYAComentarios.json()).comments.length===4); }
    catch(error){console.log(await page.evaluate(()=>({captured:JSON.parse(window.MYAComentarios.json()).comments.length,links:[...document.querySelectorAll('a[href*="/c/"]')].map(e=>e.getAttribute('href')),nativeButton:document.querySelector('#load')?.textContent,onclick:typeof document.querySelector('#load')?.onclick,panel:document.querySelector('#mya-exportador')?.innerText})));throw error;}
    await new Promise(resolve=>setTimeout(resolve,3000));
    value=await page.evaluate(()=>JSON.parse(window.MYAComentarios.json()));assert.equal(value.comments.length,4);assert.equal(new Set(value.comments.map(c=>c.id)).size,4);
    value.reportedCount=4;
    const stopped=await page.evaluate(()=>{const value=window.MYAComentarios.json();window.MYAComentarios.detener();return{value,panelRemoved:!document.querySelector('#mya-exportador')};});assert.equal(stopped.panelRemoved,true);assert.deepEqual(failures,[]);
    return value;
  } finally { await context.close(); }
}

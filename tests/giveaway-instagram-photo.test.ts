import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { instagramPhoto } from '../src/lib/giveaway/server/photo';
import { INSTAGRAM_CONSOLE_SCRIPT } from '../src/lib/giveaway/instagram-console-source';
test('Archivo para consola coincide con el que ofrece el admin y no consulta credenciales o endpoints',()=>{
  assert.equal(readFileSync('docs/sorteos/exportar-instagram.js','utf8').trim(),INSTAGRAM_CONSOLE_SCRIPT.trim());
  assert.ok(!/document\.cookie|localStorage|sessionStorage|XMLHttpRequest|fetch\(|graphql\/query|access_token/.test(INSTAGRAM_CONSOLE_SCRIPT));
});
test('Servidor convierte foto de CDN a PNG propio sin cookies ni redirecciones',async()=>{
  const original=await sharp({create:{width:800,height:600,channels:3,background:'#993b5e'}}).jpeg().toBuffer();
  let options:RequestInit|undefined;
  const request:typeof fetch=async(_url,init)=>{options=init;return new Response(new Uint8Array(original),{headers:{'Content-Type':'image/jpeg'}});};
  const png=await instagramPhoto('https://scontent.cdninstagram.com/v/photo.jpg',request);
  assert.ok(png);const metadata=await sharp(png).metadata();assert.equal(metadata.format,'png');assert.equal(metadata.width,512);assert.equal(metadata.height,512);
  assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'manual');
});
test('Servidor no consulta hosts ajenos ni sigue redirecciones, SVG o imágenes demasiado grandes',async()=>{
  let calls=0;const request:typeof fetch=async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/'}});};
  assert.equal(await instagramPhoto('https://127.0.0.1/secret',request),null);assert.equal(calls,0);
  assert.equal(await instagramPhoto('https://scontent.cdninstagram.com/photo.jpg',request),null);assert.equal(calls,1);
  const cases:Record<string,string>[]=[{'Content-Type':'image/svg+xml'},{'Content-Type':'image/jpeg','Content-Length':'2000001'}];
  for(const headers of cases)assert.equal(await instagramPhoto('https://scontent.cdninstagram.com/photo.jpg',async()=>new Response('fake',{headers})),null);
});

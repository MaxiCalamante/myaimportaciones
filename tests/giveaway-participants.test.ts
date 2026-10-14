import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport,reviewComments,csvCell,validateRules,validateComments,hasMention,parseInstagramExport,participantCsv } from '../src/lib/giveaway/participants';
import { DEFAULT_RULES,type Comment } from '../src/lib/giveaway/types';
const c=(id:string,u:string,text='con @amiga',timestamp:string|null='2026-10-18T15:00:00-03:00'):Comment=>({id,username:u,text,timestamp});
test('CSV respeta BOM, nombres, coma entre comillas y comentario multilineal',()=>{
  const rows=parseImport('\uFEFFusuario,comentario,fecha,id,nombre\r\n@ALMA,"Hola, @flor\nqué lindo",2026-10-17T12:00:00-03:00,ig1,Alma','csv');
  assert.equal(rows[0].username,'alma');assert.equal(rows[0].text,'Hola, @flor\nqué lindo');assert.equal(rows[0].displayName,'Alma');
});
test('CSV admite separador punto y coma',()=>assert.equal(parseImport('username;text\nalma;hola @flor','csv')[0].text,'hola @flor'));
test('CSV y lista vacíos o malformados se rechazan',()=>{assert.throws(()=>parseImport('text\nabc','csv'));assert.throws(()=>parseImport('','list'));assert.throws(()=>parseImport('username,text\na,b,c','csv'));});
test('Lista no fabrica comentarios ni fechas',()=>assert.deepEqual(parseImport('@Alma\n@Flor | con @alma','list'),[c('list:1','alma','',null),c('list:2','flor','con @alma',null)]));
test('Una cuenta conserva el primer comentario válido aunque otro previo no cumpla',()=>{
  const r=reviewComments([c('a','alma','sin mención','2026-10-17T12:00:00Z'),c('b','alma'),c('c','alma')],DEFAULT_RULES);
  assert.equal(r.valid.length,1);assert.equal(r.valid[0].id,'b');assert.equal(r.excluded.length,2);
});
test('Organizadora, doble ID y cuenta duplicada quedan excluidos',()=>{
  const r=reviewComments([c('a','alma'),c('a','flor'),c('b','_myaimportaciones'),c('c','alma')],DEFAULT_RULES);
  assert.equal(r.valid.length,1);assert.deepEqual(r.excluded.map(e=>e.reason).sort(),['Cuenta organizadora','ID de comentario duplicado','Una participación por cuenta'].sort());
});
test('Cierre inclusivo convierte UTC y rechaza fechas posteriores o ambiguas',()=>{
  const r=reviewComments([c('a','a','@flor','2026-10-19T02:59:59Z'),c('b','b','@flor','2026-10-19T03:00:00Z'),c('c','c','@flor','2026-10-17T12:00:00'),c('d','d','@flor','incorrecta')],DEFAULT_RULES);
  assert.equal(r.valid[0].username,'a');assert.equal(r.valid.length,1);assert.equal(r.excluded.length,3);
});
test('Fechas ausentes requieren decisión manual explícita',()=>{assert.equal(reviewComments([c('a','alma','@flor',null)],DEFAULT_RULES).valid.length,0);assert.equal(reviewComments([c('a','alma','@flor',null)],{...DEFAULT_RULES,allowUndated:true}).valid.length,1);});
test('Menciones no confunden emails, organizadora o autor con otra persona',()=>{assert.equal(hasMention(c('a','alma','mail@dominio.com'),'_myaimportaciones'),false);assert.equal(hasMention(c('a','alma','@alma @_myaimportaciones'),'_myaimportaciones'),false);assert.equal(hasMention(c('a','alma','Hola @flor'),'_myaimportaciones'),true);});
test('Exclusión manual afecta todos los comentarios y conserva motivo',()=>{const r=reviewComments([c('a','alma'),c('b','alma')],{...DEFAULT_RULES,manualExclusions:{alma:'No cumple condiciones'}});assert.equal(r.valid.length,0);assert.ok(r.excluded.every(e=>e.reason.includes('No cumple condiciones')));});
test('Reglas inválidas no llegan a sorteo',()=>{assert.throws(()=>validateRules({...DEFAULT_RULES,cutoff:'2026-10-18'}));assert.throws(()=>validateRules({...DEFAULT_RULES,manualExclusions:{alma:''}}));assert.throws(()=>validateComments([{id:'x',username:'a',text:3,timestamp:null}]));});
test('Exportación CSV neutraliza fórmulas',()=>assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"'));
test('Nombres de cuenta similares a propiedades de Object no se excluyen por error',()=>assert.equal(reviewComments([c('x','constructor')],DEFAULT_RULES).valid.length,1));

const exported = () => ({format:'mya-instagram-comments',version:1,postUrl:'https://www.instagram.com/p/FixtureMYA/',exportedAt:'2026-10-14T18:00:00Z',coverage:'loaded-comments-only',reportedCount:5,comments:[{...c('179001','fixture.alma'),displayName:'Alma',avatar:'https://scontent.cdninstagram.com/v/photo.jpg?a=1&b=2'}]});
test('JSON de consola conserva fecha, nombre y foto, y declara cobertura limitada',()=>{
  const value=parseInstagramExport(JSON.stringify(exported()));
  assert.equal(value.comments[0].displayName,'Alma');assert.equal(value.comments[0].avatar,exported().comments[0].avatar);
  assert.equal(value.coverage,'loaded-comments-only');assert.equal(value.reportedCount,5);
  assert.deepEqual(parseImport(JSON.stringify(exported()),'instagram-export'),value.comments);
  assert.deepEqual(parseImport(participantCsv(value.comments),'csv'),value.comments);
});
test('Exportación rechaza listas vacías, IDs repetidos, origen ajeno y fechas inventadas',()=>{
  for(const change of [{comments:[]},{comments:[exported().comments[0],exported().comments[0]]},{postUrl:'https://example.com/p/FixtureMYA/'},{exportedAt:'ayer'},{coverage:'complete'},{reportedCount:-1}])assert.throws(()=>parseInstagramExport(JSON.stringify({...exported(),...change})));
});
test('Fotos importadas rechazan esquemas activos, dominios ajenos y URLs con credenciales',()=>{
  for(const avatar of ['javascript:alert(1)','https://127.0.0.1/image.png','https://cdninstagram.com.evil.test/a.jpg','https://user:pass@scontent.cdninstagram.com/a.jpg','https://scontent.cdninstagram.com:8443/a.jpg'])assert.throws(()=>validateComments([{...c('photo','alma'),avatar}]));
});

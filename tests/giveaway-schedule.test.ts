import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CAMPAIGN } from '../src/lib/giveaway/live';
import { DEFAULT_RULES } from '../src/lib/giveaway/types';
import { eventDate,eventTime,eventCalendar,validateCampaignTiming } from '../src/lib/giveaway/schedule';
import { body,GiveawayError } from '../src/lib/giveaway/server/http';

test('Horario y fecha usan Argentina incluso al recibir UTC y al cambiar de día',()=>{
  assert.equal(eventTime('2026-10-18T15:00:00Z'),'12:00 h · Mediodía · Argentina');
  assert.equal(eventDate('2026-10-19T01:00:00Z'),'Domingo, 18 de octubre');
  assert.equal(eventTime('2026-10-19T01:00:00Z'),'22:00 h · Argentina');
  assert.equal(eventTime(null),'Horario a confirmar');
});
test('Cierre de comentarios no puede superar el inicio anunciado',()=>{
  assert.doesNotThrow(()=>validateCampaignTiming(DEFAULT_CAMPAIGN,DEFAULT_RULES));
  assert.throws(()=>validateCampaignTiming(DEFAULT_CAMPAIGN,{...DEFAULT_RULES,cutoff:'2026-10-18T12:00:01-03:00'}),/cierre de comentarios/);
  assert.doesNotThrow(()=>validateCampaignTiming({...DEFAULT_CAMPAIGN,scheduledFor:null},DEFAULT_RULES));
});
test('Agenda conserva mediodía en UTC y escapa líneas y delimitadores',()=>{
  const ics=eventCalendar({...DEFAULT_CAMPAIGN,title:'Mamá; regalo, especial\nOtra línea'},'https://myaimportaciones.vercel.app/sorteo');
  assert.match(ics,/DTSTART:20261018T150000Z\r\n/);
  assert.match(ics,/DTEND:20261018T153000Z\r\n/);
  assert.match(ics,/SUMMARY:Mamá\\; regalo\\, especial\\nOtra línea/);
  assert.equal(ics.split('BEGIN:VEVENT').length,2);
  assert.throws(()=>eventCalendar({...DEFAULT_CAMPAIGN,scheduledFor:null},'https://example.test'),/horario/);
});
test('API rechaza JSON primitivo o array como solicitud inválida, sin error interno',async()=>{
  for(const payload of ['null','[]','42','"start"','{']){
    await assert.rejects(()=>body(new Request('https://example.test',{method:'POST',body:payload})),e=>e instanceof GiveawayError&&e.status===400);
  }
  assert.deepEqual(await body(new Request('https://example.test',{method:'POST',body:'{"action":"start","revision":3}'})),{action:'start',revision:3});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceState,countdownParts,reelPosition } from '../src/lib/giveaway/experience';
import { DEFAULT_CAMPAIGN,type PublicGiveaway } from '../src/lib/giveaway/live';

const time=Date.parse('2026-10-18T15:00:00Z');
const initial:PublicGiveaway={version:1,serverNow:new Date(time-1000).toISOString(),revision:1,available:true,config:DEFAULT_CAMPAIGN,participantCount:75,source:'instagram',snapshotHash:null,round:null,reel:[],winner:null,winnerStatus:null,winnerAvatar:null,disqualificationReason:null};
test('El horario solo cambia la previa a preparada; no inventa un inicio, cuenta o resultado',()=>{
  assert.equal(experienceState(initial,time-1),'preview');assert.equal(experienceState(initial,time),'ready');
  assert.equal(experienceState(initial,time+86400000),'ready');assert.equal(initial.round,null);assert.equal(initial.winner,null);
  assert.equal(experienceState({...initial,available:false},time),'unavailable');
  assert.equal(experienceState({...initial,config:{...initial.config,scheduledFor:null}},time),'preview');
});
test('Todas las fases públicas se derivan de la ronda y revisión guardadas en el backend',()=>{
  const started={...initial,round:{id:'fixture-round',countdownAt:new Date(time+4000).toISOString(),spinAt:new Date(time+9000).toISOString(),revealAt:new Date(time+19500).toISOString(),attempt:2}};
  assert.equal(experienceState(started,time),'preparing');assert.equal(experienceState(started,time+4000),'countdown');
  assert.equal(experienceState(started,time+9000),'drawing');assert.equal(experienceState(started,time+19500),'revealing');
  const selected={...started,winner:{id:'public-winner',username:'fixture.alma',text:'Con @amiga',timestamp:null}};
  assert.equal(experienceState({...selected,winnerStatus:'pending'},time+20000),'verifying');
  assert.equal(experienceState({...selected,winnerStatus:'confirmed'},time+20000),'completed');
  assert.equal(experienceState({...selected,winnerStatus:'disqualified'},time+20000),'disqualified');
  assert.equal(experienceState({...selected,winnerStatus:'confirmed'},time+100000),'completed');
});
test('Contador no adelanta el cero y carrusel desacelera de forma determinista sin seleccionar cuentas',()=>{
  assert.deepEqual(countdownParts(1),[0,0,0,1]);assert.deepEqual(countdownParts(-1),[0,0,0,0]);
  assert.deepEqual(countdownParts(90061000),[1,1,1,1]);
  assert.equal(reelPosition(0),0);assert.equal(reelPosition(1),72);assert.equal(reelPosition(2),72);
  assert.ok(reelPosition(.5)-reelPosition(.4)>reelPosition(.9)-reelPosition(.8));
});

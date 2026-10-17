import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createAudit, draw, disqualify, confirmWinner } from '../src/lib/giveaway/server/audit';
import { verifyAudit } from '../src/lib/giveaway/server/verify';
import { DEFAULT_SELECTION, validateSelection, selectionPool } from '../src/lib/giveaway/selection';
import { DEFAULT_RULES } from '../src/lib/giveaway/types';
import type { PublicGiveaway } from '../src/lib/giveaway/live';

process.env.GIVEAWAY_AUDIT_SECRET='isolated-repeat-test-secret-at-least-32-characters';
const dataset=()=>({id:randomUUID(),source:{kind:'csv' as const,label:'Prueba privada',permalink:'https://www.instagram.com/p/DeIpHXtkYyf/',importedAt:'2026-10-17T12:00:00Z'},comments:['alma','flor','juli'].map((username,i)=>({id:String(i),username,text:'Con @amiga',timestamp:'2026-10-17T12:00:00Z'}))});

test('Selección: designación explícita, revisión humana, exclusiones y cadena de múltiples ejecuciones',()=>{
  assert.throws(()=>validateSelection({...DEFAULT_SELECTION,designatedUsername:'flor'}),/cuatro condiciones/);
  assert.throws(()=>validateSelection({...DEFAULT_SELECTION,excludedUsernames:['bad user']}));
  const selected={...DEFAULT_SELECTION,designatedUsername:'flor',requirementsReviewed:true};
  const a=createAudit(dataset(),DEFAULT_RULES,selected);
  assert.equal(a.draws[0].winner.username,'flor');assert.equal(a.draws[0].random.algorithm,'administrator-designated-v1');
  assert.deepEqual(a.draws[0].random.words,[]);assert.equal(verifyAudit(a,true).selection,true);
  confirmWinner(a,{follows:true,likes:true,story:true});
  assert.throws(()=>draw(a,'Nueva ejecución oficial',selected,true),/designado/);
  draw(a,'Repetición autorizada',DEFAULT_SELECTION,true);
  assert.notEqual(a.draws[1].winner.username,'flor');
  // With no review event for the second draw the next hash must link to that draw, not the older review.
  draw(a,'Tercera ejecución oficial',{...DEFAULT_SELECTION,excludePreviousWinners:false},true);
  assert.equal(a.draws[2].previousHash,a.draws[1].hash);
  disqualify(a,'No cumple los requisitos');
  const disqualified=a.draws[2].winner.username;
  const pool=selectionPool(a.snapshot.review.valid,a.draws,a.events,{...DEFAULT_SELECTION,excludePreviousWinners:false});
  assert.ok(!pool.some(c=>c.username===disqualified));
  draw(a,'Cuarta ejecución oficial',{...DEFAULT_SELECTION,excludePreviousWinners:false},true);
  assert.notEqual(a.draws[3].winner.username,disqualified);assert.equal(verifyAudit(a,true).chain,true);
  assert.throws(()=>draw(a,'x',DEFAULT_SELECTION,true),/motivo/);
  assert.throws(()=>draw(a,'Excluidos todos',{...DEFAULT_SELECTION,excludedUsernames:['alma','flor','juli']},true),/No quedan/);
});

test('Postgres: migración, selección privada, carreras, bloqueo, repetición y conservación de resultados',async()=>{
  const db=new PGlite(),actor='11111111-1111-4111-8111-111111111111';
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create function public.is_admin() returns boolean language sql as $$ select true $$;`);
    await db.exec(readFileSync('supabase/migrations/20261014140000_live_giveaway.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261017120000_giveaway_repeat_selection.sql','utf8'));
    await db.exec('set role service_role');
    const d=dataset(),config={title:'Sorteo prueba',prize:'Premio prueba',permalink:d.source.permalink,scheduledFor:null,published:true};
    const a=createAudit(d,DEFAULT_RULES,{...DEFAULT_SELECTION,designatedUsername:'flor',requirementsReviewed:true});
    await db.query('select giveaway_save_v1(0,$1,$2,$3,$4,$5)',[JSON.stringify(config),d.id,JSON.stringify(a.snapshot),'Lista de prueba',actor]);
    let revision=1;
    const save=async(settings:typeof DEFAULT_SELECTION)=>{await db.query('select giveaway_selection_v1($1,$2,$3)',[revision,JSON.stringify(settings),actor]);revision++;};
    const start=async(audit:typeof a,mode:string,round:string|null=null,rev=revision)=>(await db.query<{id:string}>('select giveaway_start_v1($1,$2,$3,$4,$5) id',[rev,JSON.stringify(audit),mode,round,actor])).rows[0].id;
    const reveal=async(id:string)=>db.query(`update giveaway_rounds set countdown_at=countdown_at-interval '60 seconds',spin_at=spin_at-interval '60 seconds',reveal_at=reveal_at-interval '60 seconds' where id=$1`,[id]);
    const publicRead=async()=>(await db.query<{data:PublicGiveaway}>('select public_giveaway_v1() data')).rows[0].data;
    await assert.rejects(save({...DEFAULT_SELECTION,designatedUsername:'unknown',requirementsReviewed:true}),/giveaway_invalid/);
    await save({...DEFAULT_SELECTION,designatedUsername:'flor',requirementsReviewed:true});
    await db.exec('set role anon');await assert.rejects(db.query('select selection from giveaway_campaign'));
    await assert.rejects(db.query('select giveaway_selection_v1(2,$1,$2)',[JSON.stringify(DEFAULT_SELECTION),actor]));
    const before=JSON.stringify(await publicRead());assert.ok(!before.includes('designated'));assert.ok(!before.includes('requirementsReviewed'));
    await db.exec('set role service_role');
    const first=await start(a,'initial');revision++;
    await assert.rejects(save(DEFAULT_SELECTION),/giveaway_locked/);
    const next=structuredClone(a);draw(next,'Nueva ejecución oficial',DEFAULT_SELECTION,true);
    await assert.rejects(start(next,'repeat',first),/giveaway_locked/);
    await reveal(first);await save(DEFAULT_SELECTION);
    await assert.rejects(start(next,'repeat',first,revision-1),/giveaway_conflict/);
    const results=await Promise.all([start(next,'repeat',first),start(next,'repeat',first)]);
    assert.equal(results[0],results[1]);revision++;
    const second=results[0];assert.notEqual(first,second);
    assert.equal((await db.query<{n:number}>('select count(*)::int n from giveaway_rounds')).rows[0].n,2);
    assert.equal((await publicRead()).winner,null);
    await db.query(`update giveaway_rounds set countdown_at=now()-interval '6 seconds',spin_at=now()-interval '1 second',reveal_at=now()+interval '9.5 seconds' where id=$1`,[second]);
    const spinning=await publicRead();assert.equal(spinning.participantCount,2);assert.equal(spinning.reel.length,2);assert.ok(!spinning.reel.some(c=>c.username==='flor'));
    await reveal(second);
    disqualify(next,'No cumplió las condiciones');
    await db.query('select giveaway_review_v1($1,$2,$3,$4,$5)',[revision,second,JSON.stringify(next),'disqualify',actor]);revision++;
    const settings={...DEFAULT_SELECTION,excludePreviousWinners:false,designatedUsername:'flor',requirementsReviewed:true,excludedUsernames:['juli']};
    // Retain the manual exclusion only when the second winner is not Juli.
    settings.excludedUsernames=next.draws[1].winner.username==='juli'?[]:['juli'];
    await save(settings);
    const thirdAudit=structuredClone(next);draw(thirdAudit,'Nueva designación revisada',settings,true);
    const third=await start(thirdAudit,'repeat',second);revision++;await reveal(third);
    assert.equal((await publicRead()).winner?.username,'flor');assert.equal(verifyAudit(thirdAudit,true).chain,true);
    assert.deepEqual((await db.query<{audit:typeof a}>('select audit from giveaway_rounds where id=$1',[first])).rows[0].audit,JSON.parse(JSON.stringify(a)));
    // A reset preserves historical rounds and clears settings tied to the old dataset.
    await db.query('select giveaway_save_v1($1,$2,$3,$4,$5,$6)',[revision,JSON.stringify(config),randomUUID(),JSON.stringify(a.snapshot),'Volver a la previa',actor]);
    const reset=(await db.query<{selection:typeof DEFAULT_SELECTION;active_round:null}>('select selection,active_round from giveaway_campaign')).rows[0];
    assert.deepEqual(reset.selection,DEFAULT_SELECTION);assert.equal(reset.active_round,null);
    assert.equal((await db.query<{n:number}>('select count(*)::int n from giveaway_rounds')).rows[0].n,3);
  } finally { await db.close(); }
});

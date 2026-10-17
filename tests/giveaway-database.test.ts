import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createAudit,disqualify,draw,confirmWinner } from '../src/lib/giveaway/server/audit';
import { reviewComments } from '../src/lib/giveaway/participants';
import { DEFAULT_RULES } from '../src/lib/giveaway/types';
import type { PublicGiveaway } from '../src/lib/giveaway/live';
process.env.GIVEAWAY_AUDIT_SECRET='isolated-giveaway-test-secret-at-least-32-characters';
test('Postgres: privado, sincronizado, ganador oculto, idempotencia y reemplazo auditado',async()=>{
  const db=new PGlite(),admin='11111111-1111-4111-8111-111111111111',customer='22222222-2222-4222-8222-222222222222';
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table public.profiles(id uuid primary key,role text);insert into profiles values('${admin}','admin'),('${customer}','customer');
      create function public.is_admin() returns boolean language sql security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;`);
    await db.exec(readFileSync('supabase/migrations/20261014140000_live_giveaway.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261017120000_giveaway_repeat_selection.sql','utf8'));
    const publicRead=async()=>(await db.query<{data:PublicGiveaway}>('select public.public_giveaway_v1() data')).rows[0].data;
    await db.exec('set role anon');assert.equal((await publicRead()).available,false);
    await assert.rejects(db.query('select giveaway_admin_history_v1()'));
    await assert.rejects(db.query('select * from giveaway_campaign'));await assert.rejects(db.query('select * from giveaway_rounds'));await assert.rejects(db.query('select * from giveaway_admin_events'));
    await db.exec(`set role authenticated;select set_config('test.uid','${customer}',false);`);
    assert.equal((await db.query('select * from giveaway_campaign')).rows.length,0);
    await assert.rejects(db.query('select giveaway_admin_history_v1()'),/giveaway_admin_required/);
    await assert.rejects(db.query('update giveaway_campaign set revision=100'));
    await assert.rejects(db.query("select giveaway_start_v1(0,'{}','initial',null,$1)",[customer]));
    await db.exec(`select set_config('test.uid','${admin}',false);`);assert.equal((await db.query('select * from giveaway_campaign')).rows.length,1);
    // Even an admin JWT cannot send a fabricated random result directly to the RPC.
    await assert.rejects(db.query("select giveaway_start_v1(0,'{}','initial',null,$1)",[admin]));
    const dataset={id:randomUUID(),source:{kind:'csv' as const,label:'CSV privado',permalink:'https://www.instagram.com/p/DeIpHXtkYyf/',importedAt:new Date().toISOString()},comments:['alma','flor','juli'].map((username,i)=>({id:`PRIVATE-COMMENT-ID-${i}`,username,text:`PRIVATE-COMMENT-${username} @amiga`,timestamp:'2026-10-17T12:00:00Z'}))};
    const snapshot={version:1,source:dataset.source,rules:DEFAULT_RULES,comments:dataset.comments,review:reviewComments(dataset.comments,DEFAULT_RULES)};
    const config={title:'SORTEO DÍA DE LA MADRE',prize:'Travel Kit SKIN1004 Centella',permalink:dataset.source.permalink,scheduledFor:null,published:true};
    await db.exec('set role service_role');await db.query('select giveaway_save_v1(0,$1,$2,$3,$4,$5)',[JSON.stringify(config),dataset.id,JSON.stringify(snapshot),'',admin]);
    await assert.rejects(db.query('select giveaway_save_v1(0,$1,$2,$3,$4,$5)',[JSON.stringify(config),dataset.id,JSON.stringify(snapshot),'',admin]),/giveaway_conflict/);
    const audit=createAudit(dataset,DEFAULT_RULES);
    const start=async(revision:number,a:typeof audit,mode='initial',previous:string|null=null)=>(await db.query<{id:string}>('select giveaway_start_v1($1,$2,$3,$4,$5) id',[revision,JSON.stringify(a),mode,previous,admin])).rows[0].id;
    const first=await start(1,audit);assert.equal(first,audit.draws[0].id);
    assert.equal(await start(1,createAudit(dataset,DEFAULT_RULES)),first);assert.equal((await db.query<{count:number}>('select count(*)::int count from giveaway_rounds')).rows[0].count,1);
    await db.exec('set role anon');const waiting=await publicRead();assert.equal(waiting.winner,null);assert.equal(waiting.reel.length,0);assert.equal(waiting.participantCount,3);assert.ok(!JSON.stringify(waiting).includes('PRIVATE-COMMENT'));assert.equal((waiting as unknown as Record<string,unknown>).audit,undefined);
    // Every viewer receives exactly the same absolute timeline and round identifier.
    const other=await publicRead();assert.deepEqual(waiting.round,other.round);
    await db.exec('set role service_role');await assert.rejects(db.query('select giveaway_save_v1(2,$1,$2,$3,$4,$5)',[JSON.stringify(config),dataset.id,JSON.stringify(snapshot),'Lista nueva por prueba',admin]),/giveaway_locked/);
    await db.query(`update giveaway_rounds set countdown_at=now()-interval '6 seconds',spin_at=now()-interval '1 second',reveal_at=now()+interval '9.5 seconds' where id=$1`,[first]);
    await db.exec('set role anon');const spinning=await publicRead();assert.equal(spinning.reel.length,3);assert.equal(spinning.winner,null);assert.ok(!JSON.stringify(spinning).includes('PRIVATE-COMMENT'));assert.ok(!JSON.stringify(spinning).includes('words'));assert.ok(!JSON.stringify(spinning).includes('signature'));
    await db.exec('set role service_role');await db.query(`update giveaway_rounds set countdown_at=countdown_at-interval '60 seconds',spin_at=spin_at-interval '60 seconds',reveal_at=reveal_at-interval '60 seconds' where id=$1`,[first]);
    await db.exec('set role anon');const revealed=await publicRead();assert.equal(revealed.winner?.username,audit.draws[0].winner.username);assert.equal(revealed.winner?.id,'public-winner');assert.equal(revealed.reel.length,0);assert.equal(revealed.winnerStatus,'pending');assert.ok(!JSON.stringify(revealed).includes('PRIVATE-COMMENT-ID'));assert.equal((revealed as unknown as Record<string,unknown>).snapshot,undefined);
    await db.exec('set role service_role');await assert.rejects(start(2,audit,'redraw',first),/giveaway_disqualification_required/);
    disqualify(audit,'No compartió la historia');await db.query('select giveaway_review_v1(2,$1,$2,$3,$4)',[first,JSON.stringify(audit),'disqualify',admin]);
    const next=structuredClone(audit);draw(next,'No compartió la historia');const second=await start(3,next,'redraw',first);assert.notEqual(second,first);assert.notEqual(next.draws[1].winner.username,next.draws[0].winner.username);assert.equal(await start(3,next,'redraw',first),second);
    await db.query(`update giveaway_rounds set countdown_at=countdown_at-interval '60 seconds',spin_at=spin_at-interval '60 seconds',reveal_at=reveal_at-interval '60 seconds' where id=$1`,[second]);
    confirmWinner(next,{follows:true,likes:true,story:true});await db.query('select giveaway_review_v1(4,$1,$2,$3,$4)',[second,JSON.stringify(next),'confirm',admin]);
    await db.exec('set role anon');assert.equal((await publicRead()).winnerStatus,'confirmed');assert.equal((await publicRead()).participantCount,2);
    await db.exec('set role service_role');await assert.rejects(db.query('select giveaway_save_v1(5,$1,$2,$3,$4,$5)',[JSON.stringify(config),randomUUID(),JSON.stringify(snapshot),'',admin]),/giveaway_reason_required/);
    await db.query('select giveaway_save_v1(5,$1,$2,$3,$4,$5)',[JSON.stringify(config),randomUUID(),JSON.stringify(snapshot),'Próximo sorteo con lista nueva',admin]);assert.equal((await db.query<{count:number}>('select count(*)::int count from giveaway_rounds')).rows[0].count,2);
  }finally{await db.close();}
});

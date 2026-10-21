import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('cloud tickets expire, run once, enforce private access and claim only authorized detail jobs',async()=>{
 const db=new PGlite();
 try{
  // Network and crypto providers are stubs; this verifies real PostgreSQL authorization and state transitions.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema extensions;create schema net;
   create function extensions.gen_random_bytes(integer)returns bytea language sql as $$select decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex')$$;
   create function extensions.digest(text,text)returns bytea language sql as $$select decode(md5($1),'hex')$$;
   create table net.requests(id bigserial,body jsonb);
   create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer)returns bigint language sql as $$insert into net.requests(body)values($3)returning id$$;
   create table supplier_tracking_settings(id boolean primary key,config jsonb);insert into supplier_tracking_settings values(true,'{"enabled":true}');
   create table suppliers(id uuid primary key default gen_random_uuid(),query_mode text,is_active boolean default true,automation_authorized boolean default true);
   create table supplier_discovery_jobs(id uuid primary key default gen_random_uuid(),supplier_id uuid references suppliers,kind text,state text default 'ready',next_run_at timestamptz default now(),leased_until timestamptz,last_attempt_at timestamptz);
  `);
  await db.exec(readFileSync('supabase/migrations/20261021181000_supplier_cloud_worker.sql','utf8'));
  const enqueue=async(job='sync')=>{
   await db.exec('reset role');
   await db.query('select enqueue_supplier_cloud_tick_v1($1)',[job]);
   return (await db.query<{ticket:string}>("select body->>'ticket' ticket from net.requests order by id desc limit 1")).rows[0].ticket;
  };
  const consume=async(ticket:string)=>{await db.exec('set role service_role');return(await db.query<{grant:unknown}>('select consume_supplier_cloud_tick_v1($1) as grant',[ticket])).rows[0].grant;};
  const ticket=await enqueue();
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select * from supplier_cloud_ticks'),/permission denied/);
   await assert.rejects(db.query('select enqueue_supplier_cloud_tick_v1($1)',['sync']),/permission denied/);
   await assert.rejects(db.query('select consume_supplier_cloud_tick_v1($1)',[ticket]),/permission denied/);
  }
  assert.deepEqual(await consume(ticket),{job:'sync',run:true});
  assert.equal(await consume(ticket),null);
  await assert.rejects(db.query('select enqueue_supplier_cloud_tick_v1($1)',['sync']),/permission denied/);
  const busy=await enqueue();assert.deepEqual(await consume(busy),{job:'sync',run:false});
  const expired=await enqueue('market');await db.query("update supplier_cloud_ticks set expires_at=now()-interval '1 second' where job='market'");assert.equal(await consume(expired),null);
  assert.equal(await consume('invalid'),null);
  await db.exec('reset role;delete from supplier_cloud_leases');
  const another=await enqueue();assert.deepEqual(await consume(another),{job:'sync',run:true});
  await db.exec(`reset role;
   insert into suppliers(query_mode)values('product_page'),('public_browser');
   insert into supplier_discovery_jobs(supplier_id,kind) select id,'detail' from suppliers;
   insert into supplier_discovery_jobs(supplier_id,kind) select id,'search' from suppliers;
   insert into suppliers(query_mode,automation_authorized)values('product_page',false);
   insert into supplier_discovery_jobs(supplier_id,kind)select id,'detail' from suppliers where not automation_authorized;
   set role service_role;`);
  const jobs=await db.query<{kind:string}>('select * from claim_supplier_cloud_details_v1(6)');
  assert.equal(jobs.rows.length,1);assert.equal(jobs.rows[0].kind,'detail');
  assert.equal((await db.query('select * from claim_supplier_cloud_details_v1(6)')).rows.length,0);
  await assert.rejects(db.query('select * from claim_supplier_cloud_details_v1(100)'),/Invalid limit/);
  await db.exec(`reset role;update supplier_tracking_settings set config='{"enabled":false}'`);
  assert.equal((await db.query<{id:unknown}>("select enqueue_supplier_cloud_tick_v1('sync') id")).rows[0].id,null);
  await assert.rejects(db.query("select enqueue_supplier_cloud_tick_v1('shell')"),/Invalid cloud job/);
 }finally{await db.close();}
});

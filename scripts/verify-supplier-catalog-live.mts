/** Run against real public responses and a persistent, isolated PostgreSQL database. */
import { PGlite } from '@electric-sql/pglite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { postAuditFixture } from '../tests/helpers/post-audit-fixture';
import { supplierAdapter } from '../src/lib/supplier-tracker/adapters';
import { fetchTrackerHtml, TrackerHttpError } from '../src/lib/supplier-tracker/network';
import { normalizeSourceCost, prepareTrackerPage } from '../src/lib/supplier-tracker/worker';

const folder = resolve(process.argv[2] ?? 'scratch/suppliers-private/mass-validation');
const privatePath = relative(resolve('scratch/suppliers-private'), folder);
if (!privatePath || isAbsolute(privatePath) || privatePath.startsWith('..')) throw Error('Usá un directorio de evidencia local privada.');
await mkdir(folder, { recursive: true });
const dir = resolve(folder, 'postgres');
const migration = 'supabase/migrations/20261107212258_supplier_catalog_discovery.sql';
const resuming = process.argv.includes('--resume');
const previous = resuming ? JSON.parse(await readFile(resolve(folder,'report.json'),'utf8')) : null;
const db = resuming ? new PGlite(dir) : (await postAuditFixture(dir)).db;
const minutes = Number(process.argv.find(arg => arg.startsWith('--minutes='))?.split('=')[1] ?? '20');
const deadline = Date.now() + minutes * 60_000;
const reasons: string[] = previous?.reasons ?? [];
let attempts = Number(previous?.attempts ?? 0);
let stopping = false;
process.once('SIGINT', () => { stopping = true; });
try {
  if (!resuming) {
    await db.exec(await readFile(migration, 'utf8'));
    await db.exec('grant select on suppliers to service_role; set role service_role; select tracker_schedule_sources_v1()');
  } else await db.exec('set role service_role');

  const snapshot = async () => {
    const data = await db.query<{state:string;report:unknown}>(`
      select s.official_key supplier, r.state, r.pages, r.new_items, r.report, r.error,
        (select count(distinct item_id) from supplier_tracker_memberships where last_run_id=r.id) eligible,
        (select count(distinct source_id) from supplier_tracker_tasks where run_id=r.id and source_id<>r.source_id) categories_detected,
        (select count(distinct source_id) from supplier_tracker_tasks where run_id=r.id and source_id<>r.source_id and state='done') categories_with_pages,
        (select count(*) from supplier_tracker_tasks where run_id=r.id and state in ('queued','running','retry')) pending_pages,
        (select count(*) from supplier_tracker_items where supplier_id=r.supplier_id and origin_cost>0) with_price,
        (select count(*) from supplier_tracker_items where supplier_id=r.supplier_id and availability_checked_at is not null) with_verified_stock,
        (select count(*) from supplier_tracker_items where supplier_id=r.supplier_id and last_error is not null) item_errors
      from supplier_tracker_runs r join suppliers s on s.id=r.supplier_id order by s.official_key
    `);
    const coverage = await db.query(`
      select s.official_key supplier,a.label,a.url,count(*) filter(where t.state='done') pages,
        count(*) filter(where t.state in ('queued','running','retry')) pending,
        count(*) filter(where t.state in ('blocked','retry')) errors,
        max(t.catalog_expected_total) expected,
        (select count(*) from supplier_tracker_memberships m where m.source_id=a.id and m.last_run_id=r.id) items
      from supplier_tracker_tasks t join supplier_tracker_sources a on a.id=t.source_id
      join supplier_tracker_runs r on r.id=t.run_id join suppliers s on s.id=r.supplier_id
      where not a.catalog_root group by s.official_key,a.id,r.id order by s.official_key,a.label
    `);
    await writeFile(resolve(folder, 'report.json'), JSON.stringify({
      at: new Date().toISOString(), attempts, resumed:resuming, runs: data.rows, coverage:coverage.rows, reasons: reasons.slice(-60),
    }, null, 2));
    return data.rows;
  };
  while (!stopping && Date.now() < deadline) {
    const batch = await db.query<{ id:string; official_key:string; kind:string; url:string; lease_token:string; source_url:string; exclusions:string[]; normalization:Record<string,string>; catalog_root:boolean; catalog_parent_id:string|null }>(`
      select t.*,p.official_key,s.url source_url,s.exclusions,s.normalization,s.catalog_root,s.catalog_parent_id
      from tracker_claim_tasks_v1(4) t join suppliers p on p.id=t.supplier_id
      left join supplier_tracker_sources s on s.id=t.source_id
    `);
    await Promise.all(batch.rows.map(async task => {
      attempts++;
      try {
        const adapter = supplierAdapter(task.official_key);
        const html = await fetchTrackerHtml(task.url, adapter.key);
        if (task.kind === 'discover') {
          const result = await prepareTrackerPage(adapter, { ...task, url:task.source_url }, task.url, html);
          await db.query('select tracker_record_catalog_page_v1($1,$2,$3)', [task.id, task.lease_token, result]);
        } else {
          const detail = adapter.detail(html, task.url);
          if (!detail) throw Error('Identidad primaria pendiente');
          await db.query('select tracker_record_monitor_v1($1,$2,$3)', [task.id, task.lease_token, { kind:'ok', ...detail, ...normalizeSourceCost(detail, task.normalization ?? {}) }]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reasons.push(task.official_key + ' ' + task.url + ' ' + message);
        await db.query('select tracker_fail_task_v1($1,$2,$3,$4)', [task.id, task.lease_token, message, error instanceof TrackerHttpError ? error.status ?? null : null]);
      }
    }));
    if (attempts && (attempts % 12 < batch.rows.length || !batch.rows.length)) {
      const state = await snapshot();
      console.log(JSON.stringify(state.map(run=>Object.fromEntries(Object.entries(run).filter(([key])=>key!=='report')))));
      if (state.every(run => !['queued','running'].includes(String(run.state)))) break;
    }
    if (!stopping && Date.now()<deadline) await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  await snapshot();
} finally {
  await db.close();
}

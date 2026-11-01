import type { SupabaseClient } from '@supabase/supabase-js';
/** Reuse the existing hosted cron. Each RPC commits <=20 rows; no browser-owned worker. */
export async function runCatalogImportJobs(db:SupabaseClient,timeBudgetMs=8000){
 const jobs=await db.from('catalog_import_jobs').select('id').eq('state','queued').order('created_at').limit(4);
 if(jobs.error){if(['42P01','PGRST205'].includes(jobs.error.code))return{installed:false,processed:0};throw new Error('No se pudieron leer los lotes pendientes.');}
 const start=Date.now(),reports:unknown[]=[];
 for(const job of jobs.data??[]){if(Date.now()-start>=timeBudgetMs)break;const r=await db.rpc('process_catalog_import_job_v1',{job_input:job.id,limit_input:20});if(r.error)throw new Error('No se pudo procesar el lote de catálogo.');reports.push(r.data);}
 return{installed:true,processed:reports.length,reports};
}

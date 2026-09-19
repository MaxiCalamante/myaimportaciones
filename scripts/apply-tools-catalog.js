const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../node_modules/@supabase/supabase-js'));

const supabase = createClient(
  'https://gqcdurxndbeeugjfworx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo'
);

async function main() {
  const processed = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_tools.json', 'utf8'));
  const original = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8'));

  const keptIds = new Set(processed.map(p => p.id));
  const excludedIds = original.filter(p => !keptIds.has(p.id)).map(p => p.id);

  console.log(`To delete (excluded small items): ${excludedIds.length}`);
  console.log(`To upsert (kept tools): ${processed.length}`);

  // 1. Delete excluded items in batches of 100
  const deleteBatchSize = 100;
  let deletedCount = 0;
  for (let i = 0; i < excludedIds.length; i += deleteBatchSize) {
    const batch = excludedIds.slice(i, i + deleteBatchSize);
    const { error } = await supabase.from('products').delete().in('id', batch);
    if (error) {
      console.error(`Error deleting batch ${i / deleteBatchSize}:`, error.message);
    } else {
      deletedCount += batch.length;
      process.stdout.write(`\rDeleted ${deletedCount}/${excludedIds.length} excluded items...`);
    }
  }
  console.log(`\nDeletion completed. Total deleted: ${deletedCount}`);

  // 2. Upsert processed tools in batches of 100
  const upsertBatchSize = 100;
  let upsertedCount = 0;
  for (let i = 0; i < processed.length; i += upsertBatchSize) {
    const batch = processed.slice(i, i + upsertBatchSize);
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\nError in upsert batch ${i / upsertBatchSize}:`, error.message);
    } else {
      upsertedCount += batch.length;
      process.stdout.write(`\rUpserted ${upsertedCount}/${processed.length} tools...`);
    }
  }
  console.log(`\nUpsert completed! Total upserted: ${upsertedCount}`);
}

main().catch(console.error);

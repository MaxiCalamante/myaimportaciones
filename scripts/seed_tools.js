const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../node_modules/@supabase/supabase-js'));

const supabase = createClient(
  'https://gqcdurxndbeeugjfworx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo'
);

async function main() {
  const rawData = fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8');
  const products = JSON.parse(rawData);
  console.log(`Total products to upsert: ${products.length}`);

  const batchSize = 100;
  let successCount = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\nError in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const item of batch) {
        const { error: itemErr } = await supabase.from('products').upsert([item], { onConflict: 'id' });
        if (itemErr) {
          console.error(`  Failed on SKU ${item.slug}:`, itemErr.message);
        } else {
          successCount++;
        }
      }
    } else {
      successCount += batch.length;
      process.stdout.write(`\rUpserted ${successCount}/${products.length} products...`);
    }
  }

  console.log(`\nFinished! Successfully upserted ${successCount} products into Supabase.`);
}

main().catch(console.error);

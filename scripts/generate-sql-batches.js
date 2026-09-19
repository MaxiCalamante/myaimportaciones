const fs = require('fs');

const processed = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_tools.json', 'utf8'));
const original = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8'));

const keptIds = new Set(processed.map(p => p.id));
const excludedIds = original.filter(p => !keptIds.has(p.id)).map(p => p.id);

console.log(`Excluded: ${excludedIds.length}, Kept: ${processed.length}`);

// 1. Delete SQL
const deleteSql = `DELETE FROM products WHERE id IN (${excludedIds.map(id => `'${id}'`).join(', ')});`;
fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/delete_excluded.sql', deleteSql);
console.log('Created delete_excluded.sql');

// 2. Update SQL in batches of 700
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

const batchSize = 700;
const numBatches = Math.ceil(processed.length / batchSize);

for (let b = 0; b < numBatches; b++) {
  const batch = processed.slice(b * batchSize, (b + 1) * batchSize);
  
  // Create VALUES string: (id, category_id, retail_price, wholesale_price, description)
  const values = batch.map(p => {
    return `('${p.id}'::uuid, '${p.category_id}'::uuid, ${p.retail_price}, ${p.wholesale_price}, '${escapeSql(p.description)}')`;
  }).join(',\n');

  const sql = `
UPDATE products AS p
SET
  category_id = v.category_id,
  retail_price = v.retail_price,
  wholesale_price = v.wholesale_price,
  description = v.description,
  updated_at = NOW()
FROM (VALUES
${values}
) AS v(id, category_id, retail_price, wholesale_price, description)
WHERE p.id = v.id;
  `.trim();

  fs.writeFileSync(`c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/update_batch_${b + 1}.sql`, sql);
  console.log(`Created update_batch_${b + 1}.sql with ${batch.length} items`);
}

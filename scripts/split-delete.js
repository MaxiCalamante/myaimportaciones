const fs = require('fs');

const original = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8'));
const processed = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_tools.json', 'utf8'));

const keptIds = new Set(processed.map(p => p.id));
const excludedIds = original.filter(p => !keptIds.has(p.id)).map(p => p.id);

console.log('Total excluded IDs:', excludedIds.length);

const half = Math.ceil(excludedIds.length / 2);
const part1 = excludedIds.slice(0, half);
const part2 = excludedIds.slice(half);

const sql1 = `DELETE FROM products WHERE id IN (${part1.map(id => `'${id}'`).join(', ')});`;
const sql2 = `DELETE FROM products WHERE id IN (${part2.map(id => `'${id}'`).join(', ')});`;

fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/delete_1.sql', sql1);
fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/delete_2.sql', sql2);

console.log(`Created delete_1.sql (${part1.length} IDs) and delete_2.sql (${part2.length} IDs)`);

import { execFileSync } from 'node:child_process';

// Inspect the index, including staged changes, rather than ignored private working copies.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbiddenDirectories = ['docs/catalog-audit/', 'docs/pricing-review/', 'docs/pricing-review-2026-10-02/'];
const privateFields = /["'](?:purchase_price(?:_usd)?|landed_cost|freight_cost|supplier_live_price|source_document|source_url)["']\s*:/i;
const failures = [];
for (const path of paths.filter(path => path.startsWith('docs/'))) {
  if (forbiddenDirectories.some(directory => path.startsWith(directory))) { failures.push(path); continue; }
  if (!/\.(?:json|csv|html|sql)$/i.test(path)) continue;
  const content = execFileSync('git', ['show', `:${path}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (privateFields.test(content)) failures.push(path);
}
if (failures.length) { console.error('Private evidence must be removed from the Git index:\n' + failures.join('\n')); process.exitCode = 1; }
else console.log('Public evidence guard passed.');

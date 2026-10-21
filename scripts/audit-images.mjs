import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("Tienda WEB/scripts/audit_output.json", "utf-8"));

async function checkUrl(url) {
  if (!url) return { ok: false, status: 0, reason: "No URL" };
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function auditCategory(catKey) {
  const items = data[catKey] || [];
  console.log(`\nChecking images for ${catKey} (${items.length} items)...`);
  let issues = 0;
  for (const item of items) {
    if (!item.image_url) {
      console.log(`[NO IMAGE] ${item.title} (${item.id})`);
      issues++;
      continue;
    }
    const res = await checkUrl(item.image_url);
    if (!res.ok) {
      console.log(`[HTTP ${res.status}] ${item.title} -> ${item.image_url}`);
      issues++;
    }
    // Also check variants
    if (item.variants && item.variants.length > 0) {
      for (const v of item.variants) {
        if (v.image_url && v.image_url !== item.image_url) {
          const vres = await checkUrl(v.image_url);
          if (!vres.ok) {
            console.log(`  [VARIANT HTTP ${vres.status}] ${item.title} - ${v.title} -> ${v.image_url}`);
            issues++;
          }
        }
      }
    }
  }
  console.log(`Done ${catKey}: ${issues} broken URL issues found.`);
}

async function run() {
  await auditCategory("cuidado-capilar");
  await auditCategory("cosmetica-coreana");
  await auditCategory("herramientas-equipamiento");
}

run();

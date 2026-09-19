const fs = require('fs');

async function listAllSupplierDepts() {
  const res = await fetch('https://www.totalherramientasoficial.com.py/produtos');
  const html = await res.text();

  // Find all /produtos/.../filter?d=... or similar
  const matches = [...html.matchAll(/href="([^"]*\/produtos\/([^"]*\/)?filter\?[^"]*d=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  
  const depts = new Map();
  for (const m of matches) {
    const url = m[1];
    const deptId = m[3];
    const rawName = m[4].replace(/<[^>]+>/g, '').trim();
    if (rawName && !depts.has(deptId)) {
      depts.set(deptId, { id: deptId, name: rawName, url });
    }
  }

  console.log(`Found ${depts.size} unique departments:`);
  for (const d of depts.values()) {
    console.log(`d=${d.id} | ${d.name} | ${d.url}`);
  }
}

listAllSupplierDepts().catch(console.error);

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_PRODUCT_COLUMNS, mapProduct, type DbProduct } from '../src/lib/catalog-data';
import { isExcludedCategory } from '../src/lib/commerce-policy';

// Read-only audit. Never writes to the catalog or reads private cost/source columns.
nextEnv.loadEnvConfig(process.cwd());
const site = 'https://myaimportaciones.vercel.app';
const folder = 'docs/product-quality-2026-10-02';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
await fs.mkdir(folder, { recursive: true });
const products: DbProduct[] = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await db.from('products').select(PUBLIC_PRODUCT_COLUMNS).order('id').range(offset, offset + 499);
  if (error) throw error;
  products.push(...data as unknown as DbProduct[]);
  if (data.length < 500) break;
}
const { data: categories, error } = await db.from('categories').select('id,name,slug,parent_id');
if (error) throw error;
const excluded = new Set(categories.filter(c => isExcludedCategory(c.slug)).map(c => c.id));
categories.forEach(c => { if (excluded.has(c.parent_id)) excluded.add(c.id); });
const urls = [...new Set(products.flatMap(p => [p.image_url, ...(p.image_urls ?? [])]).filter((u): u is string => !!u))];
type Media = { url: string; ok: boolean; width?: number; height?: number; bytes?: number; error?: string; placeholder?: boolean };
const media = new Map<string, Media>();
let cursor = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    let result: Media = { url, ok: false };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const target = new URL(url, site);
        if (target.protocol !== 'https:') throw new Error('Protocolo no permitido');
        const response = await fetch(target, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = Buffer.from(await response.arrayBuffer());
        const info = await sharp(body).metadata();
        if (!info.width || !info.height) throw new Error('Imagen sin dimensiones');
        result = { url, ok: true, width: info.width, height: info.height, bytes: body.length, placeholder: /placeholder|unsplash/i.test(url) };
        break;
      } catch (e) { result.error = e instanceof Error ? e.message : String(e); }
    }
    media.set(url, result);
  }
}));
const rows = products.map(p => {
  const mapped = mapProduct({ ...p, categories: null });
  const category = categories.find(c => c.id === p.category_id);
  const visible = !!p.is_active && !p.is_wholesale_only && !excluded.has(p.category_id) && !/iphone|smartphone|celular/i.test(p.title);
  const issues: string[] = [], improvements: string[] = [];
  const description = mapped.description.trim();
  const images = [...new Set([p.image_url, ...(p.image_urls ?? [])].filter((u): u is string => !!u))];
  const checks = images.map(u => media.get(u)!);
  const specs = Object.entries(p.specifications ?? {}).filter(([,v]) => v);
  if (!p.title?.trim()) issues.push('Título vacío');
  if (!description) issues.push('Descripción vacía');
  else {
    if (description.length < 80) improvements.push('Descripción breve: revisar utilidad para comprar');
    if (/^Consultá la presentación, especificaciones/.test(description)) issues.push('Descripción sustituida por aviso genérico en la tienda');
    else if (/Consultá (?:disponibilidad y condiciones de entrega|la presentación, disponibilidad y condiciones)|Confirmá (?:la presentación|disponibilidad)/i.test(description)
      && description.replace(p.title, '').replace(/Presentación:[^.]+\./i, '').replace(/Consultá[^.]+\./gi, '').trim().length < 65) issues.push('Descripción de plantilla: repite nombre/presentación sin explicar el producto');
    if (/<\/?[a-z][^>]*>|&(?:nbsp|amp|lt|gt);/i.test(description)) issues.push('HTML sin limpiar en la descripción');
    if (/100%.*(?:original|garantizado)|cura\b|elimina.*(?:acn[eé]|arrugas)|garant[ií]a oficial/i.test(description)) improvements.push('Revisar respaldo de afirmaciones de eficacia/autenticidad/garantía');
  }
  if (!p.image_url) issues.push('Sin imagen principal');
  for (const m of checks) {
    if (!m.ok) issues.push(`Imagen no cargó: ${m.error}`);
    else {
      if (m.placeholder) issues.push('Imagen genérica o placeholder');
      if (Math.max(m.width!, m.height!) < 600) improvements.push('Foto de baja resolución (lado mayor <600 px)');
      else if (Math.max(m.width!, m.height!) < 1000) improvements.push('Foto ampliable mejorable (lado mayor <1000 px)');
    }
  }
  if (images.length < 2) improvements.push('Una sola foto: falta vista adicional/etiqueta/contenido');
  if (!p.brand) issues.push('Marca vacía');
  if (!p.sku) improvements.push('Sin código SKU');
  if (!category) issues.push('Categoría inexistente');
  if (!p.slug) issues.push('Sin enlace de producto');
  if (!(Number(p.retail_price) > 0)) issues.push('Precio inválido');
  if (!specs.length) improvements.push('Sin ficha técnica estructurada');
  const tool = ['Total', 'Wadfow'].includes(p.brand ?? '');
  if (tool && /bater[ií]a|inal[aá]mbric|\b(?:12|20|42)\s*v\b/i.test(p.title) && !/inclu|sin bater|no inclu|solo.*(?:cuerpo|herramienta)/i.test(description + JSON.stringify(p.specifications))) improvements.push('Confirmar qué baterías/cargador/accesorios incluye');
  if (tool && !p.warranty_terms) improvements.push('Sin condiciones específicas de garantía');
  return { id: p.id, sku: p.sku, title: p.title, slug: p.slug, category: category?.name, brand: p.brand, visible, active: p.is_active, description, specifications: p.specifications, imageCount: images.length, media: checks, issues: [...new Set(issues)], improvements: [...new Set(improvements)] };
});
const visible = rows.filter(r => r.visible);
const routes: { id: string; slug: string; ok: boolean; status?: number; error?: string }[] = [];
let routeCursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (routeCursor < visible.length) {
    const row = visible[routeCursor++];
    try {
      const response = await fetch(`${site}/producto/${encodeURIComponent(row.slug)}`, { signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      const hasProduct = html.includes('application/ld+json') && html.includes('"@type":"Product"');
      routes.push({ id: row.id, slug: row.slug, ok: response.ok && hasProduct, status: response.status });
      if (!response.ok || !hasProduct) row.issues.push(`Ficha pública no válida: HTTP ${response.status}, datos Product ${hasProduct}`);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      routes.push({ id: row.id, slug: row.slug, ok: false, error });
      row.issues.push(`Ficha pública no comprobada: ${error}`);
    }
  }
}));
const counts = (list: typeof rows, key: 'issues' | 'improvements') => Object.fromEntries([...new Set(list.flatMap(r => r[key]))].map(issue => [issue, list.filter(r => r[key].includes(issue)).length]));
const summary = { checkedAt: new Date().toISOString(), total: rows.length, visible: visible.length, drafts: rows.filter(r => !r.active).length, visibleWithIssues: visible.filter(r => r.issues.length).length, visibleWithImprovements: visible.filter(r => r.improvements.length).length, uniqueImages: media.size, failedImages: [...media.values()].filter(m => !m.ok).length, checkedRoutes: routes.length, failedRoutes: routes.filter(r => !r.ok).length, visibleIssues: counts(visible, 'issues'), visibleImprovements: counts(visible, 'improvements'), allIssues: counts(rows, 'issues'), scope: 'Live database; every stored image fetched and decoded; every visible detail route checked over HTTP for Product structured data. Image/product semantic match and full visual review require separate validation.' };
await fs.writeFile(path.join(folder, 'audit.json'), JSON.stringify({ summary, products: rows, routes }, null, 2));
const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const body = rows.sort((a,b) => Number(b.visible)-Number(a.visible) || b.issues.length-a.issues.length).map(r => `<tr data-search="${escape((r.title+' '+r.sku).toLowerCase())}" data-visible="${r.visible}" data-issue="${!!r.issues.length}"><td><a href="${site}/producto/${encodeURIComponent(r.slug)}" target="_blank" rel="noreferrer">${escape(r.title)}</a><small>${escape(r.sku)} · ${escape(r.category)} · ${r.visible ? 'Publicado' : 'Fuera de tienda'}</small></td><td>${r.issues.map(s => `<p class="issue">${escape(s)}</p>`).join('')}${r.improvements.map(s => `<p>${escape(s)}</p>`).join('') || 'Sin observaciones automáticas'}</td><td><p>${escape(r.description)}</p><small>${escape(JSON.stringify(r.specifications))}</small></td><td>${r.media.map(m => `<small>${m.ok ? `${m.width}×${m.height}` : escape(m.error)} · <a href="${escape(new URL(m.url,site))}" target="_blank" rel="noreferrer">Ver foto</a></small>`).join('')}</td></tr>`).join('');
await fs.writeFile(path.join(folder, 'revision.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYA · Calidad de fichas</title><style>body{font:15px system-ui;margin:24px;background:#f5f8fa;color:#203040}h1{margin-bottom:8px}small{display:block;color:#5b6b7b;margin:5px 0}p{line-height:1.5}a{color:#0369a1}.issue{color:#b42318;font-weight:600}.table{overflow:auto}table{border-collapse:collapse;background:white;width:100%}td,th{padding:14px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#e5eff6}td:first-child{min-width:240px}td:nth-child(2){min-width:260px}td:nth-child(3){min-width:380px;max-width:600px}input,select{padding:10px;font:inherit;margin:10px 5px 20px 0}.stats{display:flex;gap:15px;flex-wrap:wrap}.stats p{padding:16px;background:white;border-radius:8px}.stats b{display:block;font-size:25px}</style><h1>MYA · Revisión de fichas, 02/10/2026</h1><p>Base de datos consultada en vivo. Fotos descargadas por HTTP y decodificadas para comprobar carga y dimensiones. Las observaciones en rojo necesitan corrección; el resto son mejoras editoriales. Una sola foto o una ficha sin campos técnicos no prueban por sí solas un error. Esta revisión automática no certifica que cada foto corresponda visualmente a su variante ni respalda promesas del fabricante.</p><div class="stats"><p><b>${summary.total}</b>Registros</p><p><b>${summary.visible}</b>Publicados</p><p><b>${summary.visibleWithIssues}</b>Publicados con problemas</p><p><b>${summary.failedImages}</b>Fotos que no cargaron</p></div><input id="q" placeholder="Buscar producto o SKU" aria-label="Buscar"><select id="visible" aria-label="Publicación"><option value="true">Publicados</option><option value="">Todos</option><option value="false">Fuera de tienda</option></select><select id="issue" aria-label="Problemas"><option value="">Todas las observaciones</option><option value="true">Con problemas</option></select><div class="table"><table><thead><tr><th>Producto</th><th>Observaciones</th><th>Descripción y ficha actuales</th><th>Fotos</th></tr></thead><tbody>${body}</tbody></table></div><script>const controls=['q','visible','issue'].map(id=>document.getElementById(id));function filter(){const [q,v,i]=controls.map(e=>e.value.toLowerCase());document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!(r.dataset.search.includes(q)&&(!v||r.dataset.visible===v)&&(!i||r.dataset.issue===i)))}controls.forEach(e=>e.addEventListener('input',filter));filter();</script></html>`);
console.log(JSON.stringify(summary, null, 2));

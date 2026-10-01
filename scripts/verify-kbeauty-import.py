"""Verify actual public access and media; produce a private comparison report."""
import json,re,html,sys,requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/supplier-import-2026-10-01'
rows=json.loads((OUT/'reviewed-catalog.json').read_text(encoding='utf8'))
env=dict(re.findall(r'^([A-Z_0-9]+)=(.*)$',(ROOT/'.env.local').read_text(encoding='utf8'),re.M))
base=env['NEXT_PUBLIC_SUPABASE_URL'].strip('"\'');key=env['NEXT_PUBLIC_SUPABASE_ANON_KEY'].strip('"\'')
headers={'apikey':key,'Authorization':'Bearer '+key}
columns=re.search(r'PUBLIC_PRODUCT_COLUMNS = "([^"]+)"',(ROOT/'src/lib/catalog-data.ts').read_text(encoding='utf8'))[1]
public=requests.get(base+'/rest/v1/products',params={'select':columns},headers=headers,timeout=30)
assert public.status_code==200,public.status_code
publicrows=public.json();assert len(publicrows)==96
assert all(p['is_active'] and p['stock']==0 and p['fulfillment_mode']=='supplier' for p in publicrows)
private=requests.get(base+'/rest/v1/products',params={'select':'id,source_url,supplier_live_price'},headers=headers,timeout=30)
assert private.status_code in [401,403],private.status_code
cost=requests.get(base+'/rest/v1/product_costs',params={'select':'product_id,origin_cost'},headers=headers,timeout=30)
assert cost.status_code in [401,403] or (cost.status_code==200 and cost.json()==[])
def check(row):
 r=requests.get(row['image'],timeout=30);assert r.status_code==200 and r.headers.get('Content-Type','').startswith('image/'),row['key']
 return row['key']
with ThreadPoolExecutor(max_workers=8) as pool:images=list(pool.map(check,rows))
verification=dict(public_products=len(publicrows),public_source_columns_denied=private.status_code,private_costs_hidden=True,media_verified=len(images),physical_stock_zero=True,checked_at='2026-10-01')
(OUT/'verification.json').write_text(json.dumps(verification,indent=2),encoding='utf8')
def esc(s):return html.escape(str(s),quote=True)
def money(n):return '$ '+f'{n:,.0f}'.replace(',','.')
tbody=[]
for r in rows:
 offers={o['supplier']:o for o in r['offers']};cells=[]
 for name in ['atacado','star']:
  o=offers.get(name)
  cells.append(f'<td><a href="{esc(o["url"])}" target="_blank" rel="noopener">USD {o["price"]:g}</a><br>{o["quantity"]} declaradas</td>' if o else '<td>Sin oferta encontrada</td>')
 ml=r['ml'];active=r['status']=='Publicado'
 tbody.append(f'<tr data-brand="{esc(r["brand"])}" data-active="{str(active).lower()}"><td><img loading="lazy" src="{esc(r["image"])}" alt=""><b>{esc(r["title"])}</b><small>{esc(r["status"])}</small></td>'+''.join(cells)+f'<td>{esc(r["selected"])}<br><small>Más cantidad: {esc(r["largest_stock"]["supplier"])} ({r["largest_stock"]["quantity"]})</small></td><td>{money(r["purchase_ars"])}</td><td>{money(r["retail"]) if active else "Pendiente"}</td><td>'+ (f'<a href="{esc(ml["url"])}" target="_blank" rel="noopener">{money(ml["price"])}</a><small>{esc(ml["title"])}</small>' if ml else 'Sin referencia equivalente')+'</td></tr>')
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYA · Medicube y SKIN1004</title><style>body{font:15px system-ui;margin:30px;color:#24302b;background:#fafaf7}h1{font-size:28px}p{max-width:1100px;line-height:1.5}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}input,select{font:inherit;padding:10px;border:1px solid #bbb;border-radius:7px}input{min-width:320px}table{border-collapse:collapse;width:100%;background:white}th{position:sticky;top:0;background:#e8eee8;text-align:left;padding:14px}td{padding:14px;border-bottom:1px solid #ddd;vertical-align:top}td:first-child{min-width:330px}img{width:65px;height:65px;object-fit:contain;float:left;margin-right:12px}small{display:block;margin-top:6px;color:#65716b}a{color:#165d47}b{display:block}#count{padding:10px}</style><h1>MYA · Medicube y SKIN1004</h1><p><b>141 productos cargados · 96 publicados · 45 borradores · Relevamiento 01/10/2026</b></p><p>Selección por menor precio de proveedor; empate por mayor cantidad declarada. Dólar blue venta: ARS 1.560/USD. Venta: 5% debajo de la publicación argentina de Mercado Libre comparable encontrada, redondeada hacia abajo. Las referencias de búsqueda pueden tener demora de indexación; no garantizan el mínimo de todo Mercado Libre.</p><p>Las cantidades pertenecen a los proveedores y están sujetas a confirmación. No representan stock físico de MYA. <b>Flete, impuestos y comisiones pendientes: la diferencia entre venta y compra no es ganancia neta.</b> Los productos sin referencia equivalente quedaron en borrador. Los costos y enlaces del proveedor están guardados en el panel privado.</p><div class="toolbar"><input id="q" aria-label="Buscar" placeholder="Buscar producto, línea o presentación"><select id="brand" aria-label="Marca"><option value="">Todas las marcas</option><option>Medicube</option><option>SKIN1004</option></select><select id="active" aria-label="Estado"><option value="">Todos los estados</option><option value="true">Publicados</option><option value="false">Borradores</option></select><span id="count"></span></div><div style="overflow:auto"><table><thead><tr><th>Producto</th><th>Atacado USA</th><th>Star Company</th><th>Proveedor elegido</th><th>Compra ARS</th><th>Venta MYA ARS</th><th>Referencia ML ARS</th></tr></thead><tbody>'''+''.join(tbody)+'''</tbody></table></div><script>const q=document.getElementById('q'),brand=document.getElementById('brand'),active=document.getElementById('active'),count=document.getElementById('count');function filter(){let n=0;document.querySelectorAll('tbody tr').forEach(r=>{const ok=(!brand.value||r.dataset.brand===brand.value)&&(!active.value||r.dataset.active===active.value)&&r.textContent.toLowerCase().includes(q.value.toLowerCase());r.hidden=!ok;if(ok)n++});count.textContent=n+' productos'}[q,brand,active].forEach(x=>x.addEventListener('input',filter));filter();</script></html>'''
(OUT/'comparacion.html').write_text(page,encoding='utf8')
print(json.dumps(verification));

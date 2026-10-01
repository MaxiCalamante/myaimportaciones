"""Verify live public rows, media, private cost protection and approved-price preservation."""
import json,re,sys,requests,io,html,csv
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from datetime import datetime
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parents[1];out=root/'docs/cosmetics-completion-2026-10-01'
before=json.loads((out/'before-fresh.json').read_text(encoding='utf8'));after=json.loads((out/'after-final.json').read_text(encoding='utf8'))
payload=json.loads((out/'payload.json').read_text(encoding='utf8'));selection=json.loads((out/'selection.json').read_text(encoding='utf8'))
p={x['id']:x for x in after['products']};c={x['product_id']:x for x in after['costs']};cats={x['id']:x for x in after['categories']}
approved=json.loads((out.parent/'supplier-import-2026-10-01/manual-prices-audit.json').read_text(encoding='utf8'))
assert len(p)==154 and len(c)==154
for a in approved:
 assert p[a['id']]['retail_price']==a['retail_price'] and p[a['id']]['is_active']
 assert c[a['id']]['origin_cost']==a['usd'] and c[a['id']]['exchange_rate']==1550
for old in before['products']:
 for field in ['title','slug','brand','retail_price','source_url','is_active','stock','stock_verified_at','supplier_live_price']:
  assert p[old['id']][field]==old[field],(old['title'],field)
for old in before['costs']:assert c[old['product_id']]==old
for row in payload['products']:
 for field in row:
  actual=p[row['id']][field];expected=row[field]
  if field.endswith('_at') and actual and expected:
   actual=datetime.fromisoformat(actual);expected=datetime.fromisoformat(expected)
  assert actual==expected,(row['title'],field)
for row in payload['assignments']:assert p[row['id']]['category_id']==row['category_id']
for f in json.loads((out/'media-fixes.json').read_text(encoding='utf8')):assert p[f['id']]['image_url']==f['image_url']
assert all(x['category_id'] in cats for x in p.values())
assert len({x['sku'] for x in p.values()})==len(p) and len({x['slug'] for x in p.values()})==len(p)
assert all(x['fulfillment_mode']=='supplier' and x['stock']==0 and x['stock_verified_at'] is None for x in p.values())
env=dict(re.findall(r'^([A-Z_0-9]+)=(.*)$',(root/'.env.local').read_text(encoding='utf8'),re.M))
base=env['NEXT_PUBLIC_SUPABASE_URL'].strip('"\'');key=env['NEXT_PUBLIC_SUPABASE_ANON_KEY'].strip('"\'');headers={'apikey':key,'Authorization':'Bearer '+key}
columns=re.search(r'PUBLIC_PRODUCT_COLUMNS = "([^"]+)"',(root/'src/lib/catalog-data.ts').read_text(encoding='utf8'))[1]
r=requests.get(base+'/rest/v1/products',params={'select':columns},headers=headers,timeout=30);r.raise_for_status();public={x['id']:x for x in r.json()}
assert len(public)==117 and all(x['is_active'] and x['retail_price']>0 for x in public.values())
for row in payload['products']:assert public[row['id']]['retail_price']==row['retail_price']
for row in public.values():
 for field in ['title','slug','brand','retail_price','category_id','image_url']:
  assert row[field]==p[row['id']][field],(row['id'],field)
for a in approved:assert public[a['id']]['retail_price']==a['retail_price']
for fields in ['id,source_url,supplier_live_price','id,supplier_stock_status']:
 r=requests.get(base+'/rest/v1/products',params={'select':fields},headers=headers,timeout=30);assert r.status_code in [401,403],r.status_code
r=requests.get(base+'/rest/v1/product_costs',params={'select':'product_id,origin_cost'},headers=headers,timeout=30);assert r.status_code in [401,403] or r.status_code==200 and r.json()==[]
facets=requests.post(base+'/rest/v1/rpc/public_catalog_facets',json={},headers=headers,timeout=30);facets.raise_for_status();facetdata=facets.json()
assert {x['brand'] for x in facetdata['brands']}=={x['brand'] for x in public.values()}
def check_image(row):
 r=requests.get(row['image_url'],timeout=40);r.raise_for_status();im=Image.open(io.BytesIO(r.content));assert min(im.size)>100
 return dict(id=row['id'],title=row['title'],url=row['image_url'],status=r.status_code,width=im.width,height=im.height)
with ThreadPoolExecutor(max_workers=6) as pool:media=list(pool.map(check_image,public.values()))
rootcat=next(x['id'] for x in cats.values() if x['slug']=='cosmetica-coreana')
counts=Counter(cats[x['category_id']]['name'] for x in public.values())
face=sum(cats[x['category_id']]['parent_id']==rootcat or x['category_id']==rootcat for x in public.values())
v=dict(total=154,public_total=117,cosmetics_public=face,hair_public=117-face,drafts=37,new_public=12,approved_prices_preserved=38,all_existing_prices_costs_unchanged=142,category_corrections=sum(a['old_category_id']!=a['category_id'] for a in payload['assignments']),new_categories=3,photos_replaced=3,images_checked=len(media),brands=dict(Counter(x['brand'] for x in public.values())),categories=dict(counts),private_costs_protected=True,physical_stock_not_invented=True)
(out/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8');(out/'media-verification.json').write_text(json.dumps(media,ensure_ascii=False,indent=2),encoding='utf8')
if '--verify-only' in sys.argv:
 print(json.dumps(v,ensure_ascii=False))
 sys.exit(0)
def esc(x):return html.escape(str(x),quote=True)
def money(x):return '$ '+f'{x:,.2f}'.replace(',','@').replace('.',',').replace('@','.')
body=[]
for x in selection:
 supplier=x['offers'][0];alternative=''.join('<br>'+esc(o['supplier'])+': USD '+str(o['price'])+' · '+str(o['quantity'])+' declaradas' for o in x['offers'][1:])
 body.append('<tr><td><a href="https://myaimportaciones.vercel.app/producto/'+p[x['id']]['slug']+'">'+esc(x['title'])+'</a></td><td><a href="'+esc(supplier['url'])+'">'+esc(supplier['supplier'])+'</a><small>USD '+str(x['usd'])+' · '+str(supplier['quantity'])+' declaradas'+alternative+'</small></td><td>'+money(x['purchase_ars'])+'</td><td><b>'+money(x['retail_price'])+'</b></td><td>'+money(x['difference_before_expenses'])+'<small>Recargo '+str(x['markup_percent'])+'%</small></td><td><a href="'+esc(x['ml_url'])+'">'+money(x['ml_price'])+'</a><small>'+str(x['below_reference_percent'])+'% debajo de esta referencia</small></td></tr>')
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYA · Cierre de cosméticos</title><style>body{font:15px system-ui;background:#f7faf8;color:#203a2f;margin:28px}h1{font-size:28px}p{line-height:1.6;max-width:1150px}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:14px;border-bottom:1px solid #d9e3dc}th{background:#e5f0e9}small{display:block;color:#587063;line-height:1.5}a{color:#126444}td:not(:first-child){white-space:nowrap}input{padding:12px;font:inherit;margin:14px 0;width:300px}.stats{font-weight:600;background:#e5f0e9;padding:16px}</style><h1>MYA · Cosméticos revisados · 01/10/2026</h1><p class="stats">12 incorporaciones publicadas · 116 productos faciales/corporales y dispositivos · 1 producto capilar público · 8 marcas · 38 precios indicados por el usuario preservados</p><p>Se revisaron 730 ofertas del rubro cosméticos en los dos proveedores. La selección prioriza marcas reconocidas, presentación exacta, disponibilidad declarada y diferencia de reventa. Celimax, Anua, Numbuzin y Dr. Althea se evaluaron con páginas oficiales y referencias argentinas; también se sumaron Tree Hut Coco Colada y Victoria’s Secret Pure Seduction para cuidado corporal. Estas señales no prueban ni garantizan ventas futuras de MYA.</p><p><b>FX de catálogo: ARS 1.550/USD, según la tabla indicada por el usuario.</b> Diez incorporaciones conservan aproximadamente 100% de recargo sobre compra. Celimax Retinal y Anua Cleansing Oil usan recargos menores (74,87% y 66,60%) para quedar por debajo de sus referencias argentinas. El importe venta-compra es previo a flete, impuestos, comisiones y otros gastos: <b>no es ganancia neta</b>. Las referencias ML provienen de búsqueda web con demora posible de indexación y no representan el precio mínimo de todo Mercado Libre.</p><p>Los enlaces, costos, cantidades del proveedor y comparaciones están guardados en el registro privado de costos de cada producto. Las cantidades son del proveedor, no stock físico propio. El catálogo público conserva entrega a coordinar.</p><h2>Productos incorporados</h2><input id="q" aria-label="Buscar producto" placeholder="Buscar producto"><div style="overflow:auto"><table><thead><tr><th>Producto y ficha MYA</th><th>Proveedor</th><th>Compra ARS</th><th>Venta ARS</th><th>Diferencia antes de gastos</th><th>Referencia argentina ML</th></tr></thead><tbody>'''+''.join(body)+'''</tbody></table></div><h2>Correcciones y comprobación</h2><p>47 productos reubicados; subcategorías nuevas: Mascarillas faciales, Protección solar y Dispositivos faciales. Cremas, limpieza, tónicos/pads/brumas, ojos, kits y cuidado corporal quedan separados. Se conservaron los slugs existentes. Fotos de categorías reemplazadas por productos reales del catálogo; tres fotos de SKIN1004 y Medicube sustituidas por imágenes limpias de la misma presentación en Star Company. Las 117 imágenes públicas responden y tienen resolución válida; no hay SKU ni rutas duplicadas, productos públicos sin precio ni costos privados accesibles mediante la API pública.</p><p><b>37 productos permanecen en borrador</b> porque no tenían referencia argentina equivalente suficiente para fijar su venta. Están cargados para revisar, pero no se muestran al cliente. No se publicaron variantes a ciegas.</p><h2>Opciones descartadas</h2><p>Beauty of Joseon Revive Eye 30 ml: USD 21,50 y referencia local de $42.179,05 dejan poco margen después de costos. Numbuzin No.9 Essence 50 ml: costo aproximado $31.744 y publicaciones de $42.750; margen ajustado. Celimax Pore Dark Spot Serum 30 ml: USD 18,50 frente a referencias locales de $37.239; no mantiene el recargo deseado. Bare Vanilla no se sumó al no obtener una referencia comparable de precio suficientemente clara. No se añadieron medicamentos, suplementos ni tratamientos capilares al bloque facial/corporal.</p><p>Fuentes de reconocimiento y presentación: <a href="https://celimax.us/collections/best-sellers">Celimax</a> · <a href="https://anua.com/collections/heartleaf-collection">Anua</a> · <a href="https://us.numbuzin.com/products/no-5-vitamin-niacinamide-concentrated-toner-pads">Numbuzin 70 pads/180 ml</a> · <a href="https://doctoraltheaglobal.com/collections/best-sellers-2">Dr. Althea</a> · <a href="https://www.treehutshea.com/products/coco-colada-shea-sugar-scrub">Tree Hut</a> · <a href="https://www.mercadolibre.com.ar/body-splash-victorias-secret-pure-seduction-250ml/p/MLA22191362">Pure Seduction 250 ml en ML</a>.</p><script>document.getElementById('q').addEventListener('input',e=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase())));</script></html>'''
page=page.replace('47 productos reubicados',str(v['category_corrections'])+' productos reubicados')
page=page.replace('<h2>Opciones descartadas</h2>','<h2>Dos correcciones de la página pendientes de publicación</h2><p>El catálogo y las categorías ya están publicados. En la ficha se encontró que Compartir por WhatsApp apuntaba al dominio anterior, que devuelve 404, y que el precio decía con Mercado Pago aunque el medio disponible era transferencia. Ambos detalles están corregidos en el código local: enlace a la tienda actual y etiqueta Precio en pesos. Pasaron el control de tipos, cuatro pruebas de configuración, lint sin errores (111 advertencias existentes) y la compilación de producción. La etiqueta se revisó en la ficha local. Falta autorización para desplegar estas dos correcciones de código; todavía no están en la web pública.</p><p>Se comprobó el catálogo público en escritorio (1280×900) y móvil (390×844), sin desbordamiento horizontal. Filtros verificados: Celimax (5), Anua (2) y Protección solar (2). <a href="catalogo-publicado.jpg">Vista pública</a> · <a href="catalogo-mobile.jpg">Vista móvil</a> · <a href="ficha-corregida-local.jpg">Ficha corregida local</a>.</p><h2>Opciones descartadas</h2>')
(out/'cierre-cosmeticos.html').write_text(page,encoding='utf8')
with (out/'incorporaciones.csv').open('w',encoding='utf-8-sig',newline='') as f:
 fields=['title','brand','usd','purchase_ars','retail_price','difference_before_expenses','markup_percent','ml_price','ml_url','below_reference_percent'];w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(selection)
print(json.dumps(v,ensure_ascii=False))

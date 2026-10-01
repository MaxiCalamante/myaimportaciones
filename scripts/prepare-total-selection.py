"""Build a reviewed tool import from local, private source evidence. Does not apply SQL."""
import json,re,uuid,unicodedata,math,sys,html
from pathlib import Path
from datetime import datetime,timezone
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-selection-2026-10-01'
config=json.loads((OUT/'curation.json').read_text(encoding='utf-8'))
details=json.loads((OUT/'candidate-details.json').read_text(encoding='utf-8'))
before=json.loads((OUT/'before.json').read_text(encoding='utf-8'))
pairs=json.loads((OUT/'pairs-proposed.json').read_text(encoding='utf-8'))
stamp=datetime.now(timezone.utc).isoformat();fx=config['fx']
cats={c['slug']:c['id'] for c in before['categories']}
raws=[p.read_text(encoding='utf-8') for p in list(OUT.glob('market-*.txt'))+list(OUT.glob('latest-*.txt'))]
def model(o):
 return re.search(r'\b[A-Z]{2,}[A-Z0-9]*\d[A-Z0-9]*\b',o['title'])[0]
def slug(s):
 s=''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
 return re.sub('[^a-z0-9]+','-',s).strip('-')
def uid(s):return str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/'+s))
def amount(s):return float(s.replace('.','').replace(',','.'))
refs={}
for m,price,ident in config['references']:
 matches=[]
 for raw in raws:
  for block in raw.split('--------------------------------------------------------------------------------'):
   urls=re.findall(r'https://(?:www|listado)\.mercadolibre\.com\.ar/[^\s)]+',block)
   prices=[amount(v) for v in re.findall(r'\$\s*([\d.]+(?:,\d+)?)',block)]
   if urls and any(ident.lower() in u.lower() for u in urls) and m.lower() in block.lower() and price in prices:
    matches.append((urls[0],block))
 assert matches,('missing exact market evidence',m,price,ident)
 refs[m]=dict(price=price,url=matches[0][0],checked_at=stamp,kind='indexed_market_reference')
pair_by_sku={s:(family,i,other) for family,a,b in pairs for i,s,other in [(0,a,b),(1,b,a)]}
products=[];costs=[];selection=[]
for sku,name,category,metric,includes in config['items']:
 o=details[sku];m=model(o);family,tier,other=pair_by_sku[sku]
 brand='Wadfow' if o['title'].startswith('WADFOW') else 'Total'
 title=f'{brand} {name} {m}'
 source_html=(OUT/f'detail-{sku}.html').read_text(encoding='utf-8')
 soup=BeautifulSoup(source_html,'html.parser');availability=soup.find('meta',attrs={'property':'product:availability'})
 assert o['usd'] and o['usd']>0 and o['price_includes_iva'] and availability and availability.get('content')=='in stock',sku
 assert o['images'],sku
 purchase=round(o['usd']*fx,2);ref=refs.get(m)
 target=min(purchase*2,ref['price']*.95) if ref else purchase*2
 retail=math.floor((target+100)/1000)*1000-100
 retail=config['retail_overrides'].get(sku,retail)
 assert retail>purchase and (not ref or retail<=ref['price']*.95),(sku,retail,purchase,ref)
 version=config['versions'].get(family,['Entrada','Mayor potencia o capacidad'])[tier]
 description=f'{brand} {name}, modelo {m}. {metric}.\nIncluye: {includes}\nConsultá disponibilidad y condiciones de entrega antes de comprar.'
 specs={'Familia':family,'Versión':version,'Características':metric,'Contenido':includes,'Modelo alternativo':model(details[other])}
 assert len((title+' '+description+' '+' '.join(specs.values())).split())<190,sku
 pid=uid('producto/'+slug(title))
 row=dict(id=pid,category_id=cats[category],title=title,slug=slug(title),description=description,image_url=o['images'][0],image_urls=o['images'][:5],retail_price=retail,wholesale_price=0,wholesale_min_qty=1,stock=0,stock_verified_at=None,brand=brand,model=m,sku=sku,tags=[brand,family,'Herramientas'],is_active=True,is_featured=False,is_wholesale_only=False,source_url=o['url'],fulfillment_mode='supplier',supplier_available=True,supplier_last_checked_at=o['checked_at'],supplier_stock_status='in_stock',supplier_live_price=purchase,specifications=specs)
 notes=[f'Herramientas seleccionadas 2026-10-01. Precio Paraguay CON IVA: USD {o["usd"]}. FX fijo indicado por el usuario: ARS {fx}/USD.',f'Venta ARS {retail}; compra ARS {purchase}; diferencia ARS {round(retail-purchase,2)} antes de gastos. No es ganancia neta. Flete, impuestos de importación y comisiones pendientes.',f'Proveedor: {o["url"]}; consulta {o["checked_at"]}; metadata product:availability=in stock. No informa cantidad; disponibilidad sujeta a reconfirmación. Stock propio sin verificar.',f'Familia: {family}. Versión: {version}. Alternativa: {model(details[other])}.', 'Criterio comercial: selección de categorías de uso doméstico, taller y obra, con oferta local observada. No es un ranking probado de los 50 productos más vendidos ni garantiza ventas futuras.', 'Señales de ventas por familia: '+', '.join(config['demand_sources'])]
 if ref:notes.append(f'Referencia indexada Mercado Libre ARS {ref["price"]}: {ref["url"]}. Consulta {stamp}; la indexación puede tener demora. No es el mínimo exhaustivo ni confirma gastos de envío o financiación. Revisar accesorios de cada oferta. Precio de catálogo igual o inferior al 95% de esta referencia.')
 else:notes.append('Sin precio Mercado Libre equivalente verificable en esta revisión. Precio provisional de catálogo por compra x2, redondeado; no se afirma descuento frente a Mercado Libre. Validar mercado y gastos antes de comprar unidades para reventa.')
 notes.append('IVA Paraguay incluido no sustituye impuestos y gastos de importación argentinos. Compra x2 limitada por referencia ML menos 5% cuando existe. Ajustes de entrada para mantener escalera comercial: '+str(sku in config['retail_overrides']))
 cost=dict(product_id=pid,origin_cost=o['usd'],currency='USD',exchange_rate=fx,freight_per_unit=0,other_landed_cost=0,variable_cost=0,payment_fee_percent=0,minimum_contribution=0,expenses_confirmed=False,supplier_url=o['url'],verified_at=o['checked_at'],ml_price=ref['price'] if ref else None,ml_url=ref['url'] if ref else None,ml_checked_at=stamp if ref else None,source_document='\n'.join(notes))
 products.append(row);costs.append(cost);selection.append(dict(sku=sku,id=pid,title=title,slug=row['slug'],category=category,family=family,version=version,model=m,alternative_model=model(details[other]),usd=o['usd'],purchase_ars=purchase,retail_price=retail,difference_before_expenses=round(retail-purchase,2),markup_percent=round((retail/purchase-1)*100,2),reference=ref,image_url=row['image_url'],supplier_url=o['url']))
assert len(products)>=50 and len(products)==len(pairs)*2 and len({p['sku'] for p in products})==len(products)
assert not {p['sku'] for p in products}&{p['sku'] for p in before['products']}
assert all(p['stock']==0 and p['stock_verified_at'] is None for p in products)
held_families={r['family'] for r in selection if r['markup_percent']<config['minimum_markup_percent']}
for p,c,r in zip(products,costs,selection):
 p['is_active']=r['family'] not in held_families
 r['published']=p['is_active']
 if not p['is_active']:c['source_document']+='\nBorrador: el par contiene una opción con recargo menor al umbral comercial de esta selección. Revisar costo, importación y mercado antes de activar.'
published=sum(p['is_active'] for p in products)
assert published>=50 and all(sum(p['is_active'] for p in products if p['sku'] in [a,b]) in [0,2] for _,a,b in pairs)
# Category tiles use an actual product from that category, replacing unrelated legacy pictures.
updates=[]
for c in before['categories']:
 candidates=[p for p in products if p['is_active'] and p['category_id']==c['id']]
 if candidates:updates.append(dict(id=c['id'],name=c['name'],description='Herramientas Total y Wadfow. Consultá especificaciones, disponibilidad y entrega para tu destino.',image_url=candidates[0]['image_url'],display_order=c['display_order'] or 10))
updates.append(dict(id=cats['herramientas-equipamiento'],name='Herramientas y equipamiento',description='Herramientas Total y Wadfow para el hogar, taller y obra. Elegí por potencia, capacidad y accesorios incluidos.',image_url=next(p['image_url'] for p in products if p['sku']=='518635'),display_order=3))
payload=dict(products=products,costs=costs,category_updates=updates)
for filename,value in [('payload.json',payload),('selection.json',selection)]:
 (OUT/filename).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def js(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
def insert(table,objects):
 cols=list(objects[0]);types={c:('uuid' if c in ['id','product_id','category_id','parent_id'] else 'boolean' if c in ['is_active','is_featured','is_wholesale_only','supplier_available','expenses_confirmed'] else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty','display_order'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in cols}
 return f"insert into public.{table}({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({js(objects)}) as x({','.join(c+' '+types[c] for c in cols)});"
sql='begin;\n'+insert('products',products)+'\n'+insert('product_costs',costs)+'\n'
sql+=f"update public.categories c set name=x.name,description=x.description,image_url=x.image_url,display_order=x.display_order from jsonb_to_recordset({js(updates)}) as x(id uuid,name text,description text,image_url text,display_order integer) where c.id=x.id;\ncommit;"
(OUT/'import.sql').write_text(sql,encoding='utf-8')
e=html.escape
rows=''.join(f'<tr><td>{e(r["family"])}</td><td>{e(r["version"])}</td><td><a href="https://myaimportaciones.vercel.app/producto/{e(r["slug"])}">{e(r["title"])}</a></td><td>USD {r["usd"]}</td><td>{r["purchase_ars"]:,.2f}</td><td>{r["retail_price"]:,}</td><td>{r["difference_before_expenses"]:,.2f}</td><td>{r["markup_percent"]}%</td><td><a href="{e(r["supplier_url"])}">Proveedor</a></td><td>'+ (f'<a href="{e(r["reference"]["url"])}">ARS {r["reference"]["price"]:,.2f}</a>' if r['reference'] else 'Sin precio comparable verificado')+'</td></tr>' for r in selection)
report='<!doctype html><html lang="es"><meta charset="utf-8"><title>Selección de herramientas MYA</title><style>body{font:14px system-ui;margin:32px;background:#f8fafc;color:#172033}h1{font-size:28px}input{padding:12px;width:340px}table{border-collapse:collapse;margin-top:20px;width:100%}td,th{padding:10px;border-bottom:1px solid #cbd5e1;text-align:left}thead{position:sticky;top:0;background:#e0f2fe}tr:hover{background:#e0f2fe}a{color:#075985}</style><h1>60 herramientas · 30 pares</h1><p>Revisión 01/10/2026. Cambio de catálogo: ARS 1.550/USD. IVA Paraguay incluido en compra. La diferencia de venta y compra es bruta, antes de flete, impuestos de importación y comisiones. No se confirmó ganancia neta. Referencias de Mercado Libre indexadas: no garantizan el mínimo actual. Cantidades del proveedor no informadas; stock propio no declarado.</p><p>Selección por uso doméstico, taller y obra. Las señales de ventas publicadas sirven como orientación; no prueban que estos sean los 50 modelos de mayor salida.</p><input placeholder="Filtrar producto, modelo o familia" oninput="document.querySelectorAll(\'tbody tr\').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(this.value.toLowerCase()))"><table><thead><tr><th>Familia</th><th>Versión</th><th>Producto</th><th>Compra USD</th><th>Compra ARS</th><th>Venta ARS</th><th>Diferencia bruta ARS</th><th>Recargo</th><th>Origen</th><th>Referencia ML</th></tr></thead><tbody>'+rows+'</tbody></table></html>'
report=report.replace('<p>Revisión',f'<p><strong>{published} herramientas publicadas en {published//2} pares; {len(products)-published} herramientas en borrador por diferencia de precio insuficiente.</strong> Los precios sin referencia ML quedan provisionales, calculados por costo.</p><p>Revisión')
for r in selection:
 if not r['published']:
  report=report.replace(f'<a href="https://myaimportaciones.vercel.app/producto/{e(r["slug"])}">{e(r["title"])}</a>',e(r['title'])+' (BORRADOR)')
(OUT/'seleccion-privada.html').write_text(report,encoding='utf-8')
print(json.dumps(dict(products=len(products),pairs=len(pairs),market_references=len(refs),category_images=len(updates),markup_min=min(r['markup_percent'] for r in selection),markup_max=max(r['markup_percent'] for r in selection),retail=[dict(model=r['model'],price=r['retail_price'],markup=r['markup_percent']) for r in selection]),ensure_ascii=False))

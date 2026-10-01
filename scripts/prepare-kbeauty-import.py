"""Build a reviewable, one-shot catalog import from manually reviewed evidence."""
import json, re, unicodedata, csv, html, sys
from pathlib import Path
from decimal import Decimal, ROUND_FLOOR
from collections import Counter
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/supplier-import-2026-10-01'
FX=1560
STAMP=datetime.now(timezone.utc).isoformat()
# Explicit review of product, volume, version and pack; lexical suggestions alone are never approved.
APPROVED={2,3,7,9,10,11,12,13,19,21,22,24,27,28,31,33,35,36,37,40,42,43,44,45,46,47,48,51,52,54,57,59,64,65,66,67,68,69,70,71,72,74,75,76,77,78,80,81,82,83,85,86,87,89,90,92,93,94,96,97,99,113,123,124,125,126,142,149,159,164,165,167,178,182,184,189,190,192,193,195,197,200,202,204}
# These are approved exceptions to language/size parsing, with exact manually verified identity.
OVERRIDES={0:107900,23:58279.35,55:56050,56:59989.99,61:65090.7,84:84300,95:61000,100:71800,143:660250,144:625500,173:6599,191:77404.09}
products=json.loads((OUT/'comparison.json').read_text(encoding='utf8'))
market={p['key']:p for p in json.loads((OUT/'market-candidates.json').read_text(encoding='utf8'))}
media={p['key']:p for p in json.loads((OUT/'media.json').read_text(encoding='utf8'))}
cats={c['slug']:c['id'] for c in json.loads((OUT/'database-before.json').read_text(encoding='utf8'))['categories']}
def category(t):
 t=t.lower()
 if any(w in t for w in ['shampoo','conditioner']):return 'shampoos-acondicionadores'
 if 'rosemary' in t:return 'tratamientos-mascarillas-capilares'
 if 'eye' in t:return 'contorno-ojos'
 if 'travel' in t:return 'kits-de-viaje-k-beauty'
 if any(w in t for w in ['toner','pad']):return 'tonicos-pads'
 if any(w in t for w in ['cleanser','cleansing','wipes','body wash']):return 'limpieza-exfoliantes'
 if any(w in t for w in ['cream','mask','balm','booster pro','mini plus','sun stick','sun serum','suncream','uv serum']):return 'cremas-mascarillas'
 return 'serums-ampollas'
def slug(t):
 t=''.join(c for c in unicodedata.normalize('NFD',t.lower()) if unicodedata.category(c)!='Mn')
 return re.sub(r'[^a-z0-9]+','-',t).strip('-')
rows=[]; costs=[]; report=[]
for p in products:
 k=p['key']; offer=p['selected']; m=None
 if k in APPROVED:m=market[k]['suggested'];assert m
 if k in OVERRIDES:
  m=next(c for c in market[k]['candidates'] if c['price']==OVERRIDES[k] and not c['international'])
 retail=int((Decimal(str(m['price']))*Decimal('.95')).to_integral_value(rounding=ROUND_FLOOR)) if m else 0
 purchase=round(offer['price']*FX,2)
 status='Publicado' if m and retail>purchase else ('Borrador: precio objetivo debajo del costo de compra' if m else 'Borrador: falta referencia ML de la misma presentación')
 active=status=='Publicado'
 # Cost, supplier and supplier quantities belong only in the private admin cost record.
 notes=['Importación Medicube / SKIN1004 - 2026-10-01.',
  'Dólar blue venta ARS 1560/USD. Fuente: https://elcotizador.com.ar/dolar .',
  'Objetivo: 5% debajo de la publicación ML argentina comparable registrada; redondeo hacia abajo al peso.',
  'Referencia ML obtenida mediante búsqueda web: puede tener demora de indexación; no garantiza el menor precio de todo Mercado Libre.',
  'Flete, impuestos, comisiones y gastos pendientes de confirmar. Diferencia venta-compra no es ganancia neta.',status,
  'Selección: menor precio USD; empate resuelto por mayor cantidad declarada. Cantidades son del proveedor, sujetas a confirmación.']
 for o in p['offers']:notes.append(f"{o['supplier']}: USD {o['price']}; cantidad {o['quantity']}; consulta {o['checked_at']}; {o['url']}")
 notes.append(f"Mayor cantidad: {p['largest_stock']['supplier']} ({p['largest_stock']['quantity']}).")
 if m:notes.append(f"ML ARS {m['price']}: {m['title']}; {m['url']}")
 row=dict(id=p['id'],category_id=cats[category(p['title'])],title=p['title'],slug=slug(p['title'])+'-'+str(k),
  description=p['title']+'. Consultá disponibilidad y condiciones de entrega antes de comprar.',
  image_url=media[k]['public_url'],image_urls=[media[k]['public_url']],retail_price=retail if active else 0,
  wholesale_price=0,wholesale_min_qty=1,stock=0,stock_verified_at=None,brand=p['brand'],
  model=p['title'].removeprefix(p['brand']+' '),sku=f'MYA-KB-{k:03d}',
  tags=[p['brand'],'K-beauty'],is_active=active,is_featured=False,is_wholesale_only=False,
  source_url=offer['url'],fulfillment_mode='supplier',supplier_available=True,
  supplier_last_checked_at=offer['checked_at'],supplier_stock_status='available',supplier_live_price=purchase,
  specifications={'Marca':p['brand'],'Presentación':p['title'].removeprefix(p['brand']+' ')})
 cost=dict(product_id=p['id'],origin_cost=offer['price'],currency='USD',exchange_rate=FX,
  freight_per_unit=0,other_landed_cost=0,variable_cost=0,payment_fee_percent=0,minimum_contribution=0,
  expenses_confirmed=False,supplier_url=offer['url'],verified_at=offer['checked_at'],
  ml_price=m['price'] if m else None,ml_url=m['url'] if m else None,ml_checked_at=STAMP if m else None,
  source_document='\n'.join(notes))
 rows.append(row);costs.append(cost)
 report.append(dict(key=k,id=p['id'],title=p['title'],brand=p['brand'],status=status,selected=offer['supplier'],usd=offer['price'],purchase_ars=purchase,
  retail=row['retail_price'],target_retail=retail,ml=m,offers=p['offers'],largest_stock=p['largest_stock'],image=media[k]['public_url']))
assert len(rows)==141 and len({p['slug'] for p in rows})==141
assert all(not r['is_active'] or r['retail_price']>0 for r in rows)
assert all(r['stock']==0 and r['stock_verified_at'] is None for r in rows)
assert all('mercadolibre.com.ar' in c['ml_url'] for c in costs if c['ml_url'])
payload=dict(products=rows,costs=costs)
(OUT/'import-payload.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'reviewed-catalog.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
def sql_json(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
# Explicit columns preserve server defaults. Refuse collisions instead of overwriting user edits.
def insert(table,objects):
 columns=list(objects[0]);types={c:('uuid' if c in ['id','product_id','category_id'] else 'boolean' if c in ['is_active','is_featured','is_wholesale_only','supplier_available','expenses_confirmed'] else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in columns}
 return f"insert into public.{table}({','.join(columns)}) select {','.join(columns)} from jsonb_to_recordset({sql_json(objects)}) as x({','.join(c+' '+types[c] for c in columns)});"
sql='begin;\n'+insert('products',rows)+'\n'+insert('product_costs',costs)+'\n'
sql+="insert into public.suppliers(name,website,notes,is_active) values ('Atacado USA','https://atacadousa.com.py/','Proveedor paraguayo. Medicube y SKIN1004 relevados el 2026-10-01. Comparaciones guardadas en los costos privados de cada producto.',true),('Star Company','https://www.starcompany-py.com/','Proveedor paraguayo. Medicube y SKIN1004 relevados el 2026-10-01. Comparaciones guardadas en los costos privados de cada producto.',true);\ncommit;\n"
(OUT/'import.sql').write_text(sql,encoding='utf8')
with (OUT/'comparison.csv').open('w',encoding='utf-8-sig',newline='') as f:
 writer=csv.writer(f);writer.writerow(['Producto','Estado','Elegido','USD','Compra ARS','Venta ARS','ML ARS','ML link','Atacado USD','Atacado cantidad','Atacado link','Star USD','Star cantidad','Star link','Mayor cantidad'])
 for r in report:
  offers={o['supplier']:o for o in r['offers']};v=[r['title'],r['status'],r['selected'],r['usd'],r['purchase_ars'],r['retail'],r['ml']['price'] if r['ml'] else '',r['ml']['url'] if r['ml'] else '']
  for name in ['atacado','star']:
   o=offers.get(name,{});v.extend([o.get('price',''),o.get('quantity',''),o.get('url','')])
  writer.writerow(v+[r['largest_stock']['supplier']])
summary=dict(total=len(rows),active=sum(r['is_active'] for r in rows),draft=sum(not r['is_active'] for r in rows),brands=dict(Counter(r['brand'] for r in rows)),selected=dict(Counter(r['selected'] for r in report)),matched=sum(len(r['offers'])==2 for r in report),fx=FX,discount=5)
(OUT/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False));print('Low contributions before freight and fees:')
for r in report:
 if r['retail'] and r['retail']-r['purchase_ars']<10000:print(r['key'],r['title'],round(r['retail']-r['purchase_ars'],2))

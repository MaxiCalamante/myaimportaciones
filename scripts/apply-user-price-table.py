"""Prepare exact user-authorized prices; separate user costs from live supplier quotes."""
import json,sys,re,uuid,requests
from pathlib import Path
from datetime import datetime,timezone
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/supplier-import-2026-10-01'
TABLE=json.loads((OUT/'user-price-table.json').read_text(encoding='utf8'))
assert len(TABLE)==38 and len({x[0] for x in TABLE})==38
before=json.loads((OUT/'manual-prices-before.json').read_text(encoding='utf8'))
catalog={p['key']:p for p in json.loads((OUT/'comparison.json').read_text(encoding='utf8'))}
oldcost={c['product_id']:c for c in before['costs']}
existing={p['id']:p for p in before['products']}
STAMP=datetime.now(timezone.utc).isoformat()
def live(k):
 if k=='althea':o={'supplier':'atacado','url':'https://atacadousa.com.py/cosmeticos/12028-creme-facial-dralthea-345-relief-cream-50ml256221.html'}
 else:o=next(o for o in catalog[k]['offers'] if o['supplier']=='atacado').copy()
 r=requests.get(o['url'],timeout=40);r.raise_for_status();r.encoding='utf8';s=BeautifulSoup(r.text,'html.parser')
 (OUT/f'manual-live-{k}.html').write_text(r.text,encoding='utf8')
 d=json.loads(s.select_one('#product-details[data-product]')['data-product'])
 o.update(title=next(h.get_text(' ',strip=True) for h in s.select('h1') if h.get_text(strip=True)),price=d['price_amount'],quantity=d['quantity'],image_url=d['cover']['large']['url'],checked_at=datetime.now(timezone.utc).isoformat(),sku=d['reference'])
 return k,o
with ThreadPoolExecutor(max_workers=4) as pool:offers=dict(pool.map(live,[x[0] for x in TABLE]))
(OUT/'manual-supplier-verification.json').write_text(json.dumps(offers,ensure_ascii=False,indent=2),encoding='utf8')
updates=[]; costs=[]; audit=[]; new=None
for k,usd,sale in TABLE:
 o=offers[k];purchase=Decimal(str(usd))*Decimal(1550);gain=Decimal(sale)-purchase
 if k=='althea':
  pid=str(uuid.uuid5(uuid.NAMESPACE_URL,'mya-kbeauty:'+o['url']))
  title='Dr. Althea 345 Relief Cream 50 ml'
  new=dict(id=pid,category_id='10000000-0000-0000-0000-000000000006',title=title,slug='dr-althea-345-relief-cream-50-ml',description=title+'. Consultá disponibilidad y condiciones de entrega antes de comprar.',image_url=o['image_url'],image_urls=[o['image_url']],retail_price=sale,wholesale_price=0,wholesale_min_qty=1,stock=0,brand='Dr. Althea',model='345 Relief Cream 50 ml',sku='MYA-ALTHEA-345-50',tags=['Dr. Althea','K-beauty'],is_active=o['quantity']>0,is_featured=False,is_wholesale_only=False,source_url=o['url'],fulfillment_mode='supplier',supplier_available=o['quantity']>0,supplier_last_checked_at=o['checked_at'],supplier_stock_status='in_stock' if o['quantity']>0 else 'out_of_stock',supplier_live_price=round(o['price']*1550,2),specifications={'Marca':'Dr. Althea','Presentación':'345 Relief Cream 50 ml'})
  previous=[]
 else:
  pid=catalog[k]['id'];assert pid in existing;title=existing[pid]['title'];previous=catalog[k]['offers']
  assigned_category={16:'10000000-0000-0000-0000-000000000006',34:'10000000-0000-0000-0000-000000000007',70:'10000000-0000-0000-0000-000000000038',20:'10000000-0000-0000-0000-000000000038'}.get(k,existing[pid]['category_id'])
  updates.append(dict(id=pid,category_id=assigned_category,retail_price=sale,is_active=o['quantity']>0,source_url=o['url'],supplier_available=o['quantity']>0,supplier_last_checked_at=o['checked_at'],supplier_stock_status='in_stock' if o['quantity']>0 else 'out_of_stock',supplier_live_price=round(o['price']*1550,2)))
 notes=[f'Política vigente: tabla de precios indicada por el usuario, {STAMP}. Sustituye para este producto la regla anterior de ML menos 5%.',
  f'Costo indicado por el usuario: USD {usd}; cambio fijo ARS 1550/USD; compra ARS {purchase}; venta comercial ARS {sale}; diferencia venta-compra ARS {gain}.',
  'Recargo aproximado al 100%, ajustado al precio comercial exacto solicitado. La diferencia no es ganancia neta: flete, impuestos, comisiones y otros gastos pendientes.',
  f'Proveedor verificado: {o["title"]}; USD {o["price"]}; cantidad {o["quantity"]}; {o["checked_at"]}; {o["url"]}.',
  'La cotización del proveedor y el costo indicado por el usuario se conservan separados. Cantidades del proveedor, sujetas a confirmación.']
 for other in previous:notes.append(f'Comparación anterior {other["supplier"]}: USD {other["price"]}; cantidad {other["quantity"]}; {other["checked_at"]}; {other["url"]}.')
 cost=dict(product_id=pid,origin_cost=usd,currency='USD',exchange_rate=1550,supplier_url=o['url'],verified_at=STAMP,expenses_confirmed=False,source_document='\n'.join(notes))
 costs.append(cost);audit.append(dict(key=k,id=pid,product=title,usd=usd,exchange_rate=1550,purchase_ars=float(purchase),difference_before_expenses=float(gain),retail_price=sale,markup_percent=round(float(gain/purchase*100),2),supplier_usd=o['price'],supplier_url=o['url'],supplier_quantity=o['quantity'],supplier_title=o['title']))
assert all(x['supplier_quantity']>0 for x in audit)
def jq(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
sql='begin;\n'
cols=list(new);types={c:'uuid' if c in ['id','category_id'] else 'boolean' if c.startswith('is_') or c=='supplier_available' else 'numeric' if c in ['retail_price','wholesale_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'text[]' if c in ['image_urls','tags'] else 'jsonb' if c=='specifications' else 'timestamptz' if c.endswith('_at') else 'text' for c in cols}
sql+=f"insert into public.products({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({jq([new])}) as x({','.join(c+' '+types[c] for c in cols)});\n"
cols=list(updates[0]);types={c:'uuid' if c in ['id','category_id'] else 'boolean' if c in ['is_active','supplier_available'] else 'numeric' if c in ['retail_price','supplier_live_price'] else 'timestamptz' if c.endswith('_at') else 'text' for c in cols}
sql+=f"update public.products p set {','.join(c+'=x.'+c for c in cols if c!='id')},updated_at=now() from jsonb_to_recordset({jq(updates)}) as x({','.join(c+' '+types[c] for c in cols)}) where p.id=x.id;\n"
cols=list(costs[0]);types={c:'uuid' if c=='product_id' else 'numeric' if c in ['origin_cost','exchange_rate'] else 'boolean' if c=='expenses_confirmed' else 'timestamptz' if c.endswith('_at') else 'text' for c in cols}
sql+=f"insert into public.product_costs({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({jq(costs)}) as x({','.join(c+' '+types[c] for c in cols)}) on conflict(product_id) do update set {','.join(c+'=excluded.'+c for c in cols if c!='product_id')},updated_at=now();\ncommit;"
(OUT/'manual-prices.sql').write_text(sql,encoding='utf8')
(OUT/'manual-prices-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
print('Validated entries:',len(audit),'new:',title if k=='althea' else new['title'])
print('User cost different from live quote:',sum(float(x['usd'])!=float(x['supplier_usd']) for x in audit))
print('Markup range',min(x['markup_percent'] for x in audit),max(x['markup_percent'] for x in audit))
print('One Day:',next(x for x in audit if x['key']==73))

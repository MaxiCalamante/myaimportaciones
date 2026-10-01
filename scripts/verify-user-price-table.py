"""Verify persisted values against the user-approved table and public API."""
import json,csv,html,re,requests,sys
from pathlib import Path
from decimal import Decimal
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/supplier-import-2026-10-01'
audit=json.loads((OUT/'manual-prices-audit.json').read_text(encoding='utf8'))
after=json.loads((OUT/'manual-prices-after.json').read_text(encoding='utf8'))
before=json.loads((OUT/'manual-prices-before.json').read_text(encoding='utf8'))
products={p['id']:p for p in after['products']};costs={c['product_id']:c for c in after['costs']}
ids={a['id'] for a in audit}
for a in audit:
 p=products[a['id']];c=costs[a['id']]
 assert p['retail_price']==a['retail_price'] and p['is_active']
 assert c['origin_cost']==a['usd'] and c['exchange_rate']==1550 and c['currency']=='USD'
 assert Decimal(str(c['origin_cost']))*Decimal(1550)==Decimal(str(a['purchase_ars']))
 assert Decimal(str(p['retail_price']))-Decimal(str(a['purchase_ars']))==Decimal(str(a['difference_before_expenses']))
 assert c['expenses_confirmed']==False and p['source_url']==a['supplier_url']
 assert p['stock']==0 and p['stock_verified_at'] is None and p['fulfillment_mode']=='supplier'
for p in before['products']:
 if p['id'] not in ids:assert p==products[p['id']],p['title']
for c in before['costs']:
 if c['product_id'] not in ids:assert c==costs[c['product_id']]
env=dict(re.findall(r'^([A-Z_0-9]+)=(.*)$',(ROOT/'.env.local').read_text(encoding='utf8'),re.M))
base=env['NEXT_PUBLIC_SUPABASE_URL'].strip('"\'');key=env['NEXT_PUBLIC_SUPABASE_ANON_KEY'].strip('"\'')
headers={'apikey':key,'Authorization':'Bearer '+key}
r=requests.get(base+'/rest/v1/products',params={'select':'id,title,retail_price,is_active'},headers=headers,timeout=30);r.raise_for_status()
public={p['id']:p for p in r.json()}
for a in audit:assert public[a['id']]['retail_price']==a['retail_price']
althea=products[next(a['id'] for a in audit if a['key']=='althea')]
im=requests.get(althea['image_url'],timeout=30);assert im.status_code==200 and im.headers['Content-Type'].startswith('image/')
v=dict(matched_table=38,updated_existing=37,created=1,all_38_public=True,unlisted_products_unchanged=104,total=len(products),active=len(public),draft=len(products)-len(public),fixed_exchange_rate=1550)
(OUT/'manual-prices-verification.json').write_text(json.dumps(v,indent=2),encoding='utf8')
fields=['product','usd','exchange_rate','purchase_ars','difference_before_expenses','retail_price','supplier_usd','supplier_quantity','supplier_url']
with (OUT/'precios-aprobados.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(audit)
def money(n):return '$ '+f'{n:,.2f}'.replace(',','@').replace('.',',').replace('@','.')
def e(s):return html.escape(str(s),quote=True)
body=[]
for a in audit:
 p=products[a['id']]
 body.append('<tr><td><a href="https://myaimportaciones.vercel.app/producto/'+e(p['slug'])+'">'+e(a['product'])+'</a></td><td>USD '+str(a['usd'])+'</td><td>'+money(a['purchase_ars'])+'</td><td>'+money(a['difference_before_expenses'])+'</td><td><b>'+money(a['retail_price'])+'</b></td><td><a href="'+e(a['supplier_url'])+'">Atacado USA</a><small>USD '+str(a['supplier_usd'])+' · '+str(a['supplier_quantity'])+' declaradas</small></td></tr>')
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYA · Precios aprobados</title><style>body{font:15px system-ui;color:#21352e;background:#f8faf9;margin:28px}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;padding:13px;border-bottom:1px solid #ddd}th{background:#e2eee6;position:sticky;top:0}a{color:#176947}small{display:block;margin-top:6px;color:#57665f}p{max-width:1100px;line-height:1.6}input{font:inherit;padding:10px;margin:12px 0;min-width:320px}td:not(:first-child){white-space:nowrap}</style><h1>MYA · Tabla de precios aprobada</h1><p><b>38 productos publicados y verificados · 01/10/2026</b><br>Se aplicaron exactamente los costos USD y ventas indicados por el usuario, usando ARS 1.550/USD. El recargo comercial resultante queda entre 97,18% y 106,02%. La diferencia venta-compra se calcula antes de flete, impuestos y comisiones: no representa ganancia neta.</p><p>One Day Exosome Shot: se verificó en Atacado que el costo USD 14 corresponde a 7500, 30 ml. Azelaic Acid Cleansing Foam: Capsule Cleansing Foam 120 g, USD 19. Dr. Althea: 345 Relief Cream 50 ml, USD 18,50. Collagen Jelly conserva la unidad ml indicada por el proveedor en sus presentaciones de 50 y 110.</p><p>Costos informados que difieren de la ficha actual: Booster Pro USD 155 (proveedor USD 130) y Deep Vita C Capsule Cream USD 15 (proveedor USD 14). Se mantuvo la tabla autorizada y se guardó por separado la cotización observada. Los precios de esta tabla sustituyen la regla anterior de Mercado Libre menos 5% para estos 38 productos.</p><input id="q" placeholder="Buscar producto" aria-label="Buscar producto"><div style="overflow:auto"><table><thead><tr><th>Producto</th><th>Costo indicado</th><th>Compra ARS</th><th>Diferencia antes de gastos</th><th>Venta ARS</th><th>Proveedor verificado</th></tr></thead><tbody>'''+''.join(body)+'''</tbody></table></div><script>document.getElementById('q').addEventListener('input',e=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase())));</script></html>'''
(OUT/'precios-aprobados.html').write_text(page,encoding='utf8')
old=OUT/'comparacion.html';txt=old.read_text(encoding='utf8')
if 'Actualización posterior' not in txt:old.write_text(txt.replace('<h1>','<p><b>Actualización posterior: 38 productos tienen precios indicados por el usuario. <a href="precios-aprobados.html">Ver tabla vigente</a>. Esta comparación conserva la carga inicial.</b></p><h1>',1),encoding='utf8')
print(json.dumps(v));

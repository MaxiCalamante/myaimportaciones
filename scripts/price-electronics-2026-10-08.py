import json,math,re,csv,html,uuid,requests
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
rows=json.loads((OUT/'enriched.json').read_text(encoding='utf8'))
fx=requests.get('https://dolarapi.com/v1/dolares/blue',timeout=30).json()
(OUT/'fx.json').write_text(json.dumps(fx,indent=2),encoding='utf8')
exchange=fx['venta'];assert 1000<exchange<2500
# Direct browser observations on 08/10, exact RAM/storage/color/network.
# Lower catalog offers are conservative ceilings, not certified local seller quotes.
ml={
 '15448-2':('samsung-galaxy-a07-64gb-negro/p/MLA63437715',215999,203399.30,True),
 '15449-9':('samsung-galaxy-a07-64gb-green/p/MLA76067807',215999,215999,True),
 '14820-7':('samsung-galaxy-a07-128gb-negro-4gb-ram/p/MLA66215076',280000,280000,True),
 '14822-1':('samsung-galaxy-a07-green-128gb/p/MLA68588180',279999,279999,False),
 '16818-2':('celular-samsung-galaxy-a16-128gb-4gb-ram-pantalla-66-hd-triple-camara-50mp-android-14-bateria-5000mah-4g-lte-negro/p/MLA48955880',299999,288000,True),
 '13843-7':('samsung-galaxy-a16-4128-nfc-gris-claro/p/MLA65575497',320000,310000,False),
 '13869-7':('telefono-celular-samsung-galaxy-a16-128-gb-4-gb-de-ram-nfc-verde-claro/p/MLA44113911',389999,297000,True),
 '15021-7':('samsung-a17-4gb-ram-128gb-4g-full-hd-50mpx-amoled-negro-dimm/p/MLA56601052',362303.48,362303.48,True),
 '15022-4':('samsung-a17-4gb-ram-128gb-4g-full-hd-50mpx-amoled-azul-dimm/p/MLA56619313',419999,250560.31,True),
 '16831-1':('samsung-galaxy-a17-4g-8gb-256gb-azul-claro/p/MLA67284398',599999,569000,True),
 '16712-3':('samsung-a17-8gb-ram-256gb-gris/p/MLA67284396',599999,569000,True),
 '16724-6':('celular-samsung-galaxy-a17-256-gb-negro/p/MLA66044973',529999,529999,False),
 '16693-5':('samsung-galaxy-a27-5g-black/p/MLA75638698',650000,635700,True),
 '16740-6':('telefono-celular-galaxy-a27-blue-5g-256gb-camara-triple-de-50-mp-procesador-snapdragon-6-gen-3-disenado-para-durar/p/MLA75641166',660000,629100,True),
 '16821-2':('telefono-celular-galaxy-a27-pink-5g-256gb-camara-triple-de-50-mp-procesador-snapdragon-6-gen-3-disenado-para-durar/p/MLA75638615',639167,639167,True),
 '16245-6':('galaxy-a37-5g-128-gb-awesome-charcoal-gray/p/MLA74942424',720000,720000,True),
 '16247-0':('galaxy-a37-128gb-awesome-graygreen/p/MLA67414076',639999,491267.30,False),
 '16246-3':('galaxy-a37-128-gb-5g-lavender/p/MLA67416164',650000,650000,False),
 '16248-7':('telefono-celular-samsung-galaxy-a37-5g-de-128-gb-6-gb-de-ram-camara-de-50-mp-blanco/p/MLA68087692',494277.58,494277.58,True),
 '16249-4':('samsung-galaxy-a37-5g-awesome-charcoal/p/MLA70106897',710371.83,710371.83,True),
 '16252-4':('telefono-celular-samsung-galaxy-a37-5g-256gb-8gb-ram-camara-verde-oscuro-de-50mp/p/MLA68213245',691609,691609,True),
 '16251-7':('samsung-galaxy-a37-5g-8gb-ram-256-gb-lavanda/p/MLA70108915',710972.17,710972.17,True),
 '16250-0':('telefono-celular-samsung-galaxy-a37-5g-256gb-8gb-ram-camara-de-50mp-blanco/p/MLA68085223',726499.99,726499.99,True),
 '16264-7':('samsung-galaxy-a57-5g-awesome-gray/p/MLA68212479',818096,715426,True),
 '16265-4':('samsung-galaxy-a57-5g-awesome-icyblue/p/MLA68201987',834199.99,715426,True),
 '16266-1':('telefono-celular-samsung-galaxy-a57-5g-de-256-gb-8-gb-de-ram-funciones-de-ia-azul/p/MLA69983500',827999.31,827999.31,True),
 '16267-8':('telefono-celular-samsung-galaxy-a57-5g-256gb-8gb-ram-caracteristicas-ai-lilac/p/MLA69983495',830999.99,701558.99,True),
 '16750-5':('samsung-galaxy-s26-512-gb-12-gb-galaxy-ai-camara-triple-azul/p/MLA65559882',2094444,2094444,True),
 '16664-5':('tablet-samsung-galaxy-tab-a11-128gb/p/MLA74740146',579999,579999,True),
}
# Exact bare handset is a conservative ceiling for a charger/funda bundle.
for target,source in [('16834-2','14822-1'),('13842-0','16818-2'),('17067-3','15021-7')]:ml[target]=ml[source]
by_sku={r['sku']:r for r in rows}
for sku,(path,price,ceiling,available) in ml.items():
 r=by_sku[sku];r['reference']={'url':'https://www.mercadolibre.com.ar/'+path,'price':price,'currency':'ARS','available':available,'ceiling':ceiling,'method':'Direct browser, final main price. Lower new-option price used only as conservative ceiling; seller conditions not certified.'}
 if sku in ['16834-2','13842-0','17067-3','14820-7']:r['reference']['bundle_note']='Bare device price used as ceiling; accessory assigned no unverified resale premium.'
by_sku['16691-1']['reference']={'url':'https://www.opendata.ar/productos/tablet-samsung-galaxy-tab-s10-lite-6-128gb-5g-grey-wi-fi-sm-x406b-ofei9/','price':837999.96,'currency':'ARS','available':True,'method':'Direct browser 08/10; gray selected, 6/128 SM-X406B 5G, purchase button enabled. Conditional transfer discount excluded.'}
by_sku['15759-9']['reference']={'url':'https://multipoint.com.ar/tienda/tablets/tablet-samsung-galaxy-tab-a11-lte-644gb-gray','price':449999,'currency':'ARS','available':True,'method':'Direct primary HTML 08/10: SM-X135GZAAL09, gray, 4/64 LTE, product buy control data-value 449999,00. Conditional bank coupon excluded.'}
# Primary Argentine retailer family ceilings prevent cherry-picking expensive colors.
caps={('Galaxy A07','64 GB'):217350,('Galaxy A07','128 GB'):251750,('Galaxy A16','128 GB'):285650,('Galaxy A17','128 GB'):308700,('Galaxy A17','256 GB'):443750,('Galaxy A37','128 GB'):494277.58,('Galaxy A37','256 GB'):679200,('Galaxy A57','256 GB'):787900}
for r in rows:
 pending=[];ref=r['reference'];cost=r['purchase_usd']*exchange
 if r.get('identity_pending'):pending.append(r['identity_pending'])
 if r['part']=='A3526' and r['specifications'].get('SIM')=='Sólo eSIM':
  r['specifications']['SIM']='SIM física + eSIM (versión a confirmar)';r['title']=r['title'].replace('Sólo eSIM','SIM física + eSIM (a confirmar)');r['description']=r['description'].replace('Sólo eSIM','SIM física + eSIM (a confirmar)');pending.append('A3526 tiene bandeja SIM según Apple; la lista indica eSIM. Confirmar versión con el proveedor.');ref=None;r['reference']=None
 if ref and r['family'].startswith('iPhone 18') and 'a confirmar' in ref.get('description','').lower():pending.append('La tienda comparable indica precio y condición comercial a confirmar.')
 if not ref:pending.append('Falta comparable argentino disponible de la versión exacta.')
 elif ref.get('available') is False:pending.append('No se certificó stock del comparable exacto.')
 reference_ars=(ref['price']*(exchange if ref.get('currency','USD')=='USD' else 1)) if ref else None
 ceiling=min(reference_ars,ref.get('ceiling',reference_ars),caps.get((r['family'],r['specifications']['Almacenamiento']),float('inf'))) if ref else None
 # Owner delegated electronics discretion: 3% below competitive ceiling,
 # retaining at least 15% purchase markup before unconfirmed operating expenses.
 price=math.floor((ceiling*.97 if ceiling else cost*1.25)/100)*100
 gross=round(price-cost,2);markup=round(gross/cost*100,2)
 if ceiling and markup<15:pending.append('Margen antes de gastos menor al piso de 15% sobre compra; renegociar costo o precio.')
 if r['specifications']['Condición']!='Nuevo':pending.append('Confirmar estado de unidad, batería y garantía antes de ofrecer.')
 r.update(retail_price=price,resale_usd=round(price/exchange,2),purchase_ars=round(cost,2),gross_before_expenses=gross,purchase_markup_percent=markup,competitive_ceiling_ars=ceiling,reference_ars=reference_ars,pending=pending,eligible=not pending)
 r['specifications'].update({'Cotización USD/ARS':str(exchange),'Fecha de cotización':'08/10/2026','Gama':('Pro' if 'Pro' in r['family'] else 'Air' if 'Air' in r['family'] else 'Galaxy S' if 'Galaxy S' in r['family'] else 'Galaxy A' if 'Galaxy A' in r['family'] else 'Estándar')})
(OUT/'priced.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'ml-observations.json').write_text(json.dumps({k:{'url':'https://www.mercadolibre.com.ar/'+v[0],'final_price_ars':v[1],'conservative_ceiling_ars':v[2],'stock_verified':v[3],'checked_date':'2026-10-08'} for k,v in ml.items()},ensure_ascii=False,indent=2),encoding='utf8')
fields=['sku','title','purchase_usd','purchase_ars','retail_price','resale_usd','gross_before_expenses','purchase_markup_percent','eligible','pending','reference_ars','competitive_ceiling_ars','reference_url']
with (OUT/'revision-precios.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.DictWriter(f,fields);writer.writeheader()
 for r in rows:writer.writerow({**{k:r.get(k) for k in fields if k not in ['pending','reference_url']},'pending':' | '.join(r['pending']),'reference_url':(r['reference'] or {}).get('url','')})
table=''.join('<tr>'+''.join('<td>'+html.escape(str(v))+'</td>' for v in [r['sku'],r['title'],r['purchase_usd'],r['resale_usd'],f"{r['retail_price']:,.0f}",r['gross_before_expenses'],r['purchase_markup_percent'],'Listo' if r['eligible'] else 'Borrador','; '.join(r['pending'])])+'</tr>' for r in rows)
(OUT/'revision-privada.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>MYA · Revisión privada electrónica</title><style>body{font:14px system-ui;margin:24px;color:#172033}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{position:sticky;top:0;background:#eef4fb}tr:nth-child(even){background:#fafafa}input{padding:12px;width:400px;max-width:90%}</style><h1>Electrónica · Revisión privada de precios</h1><p>137 variantes. Cotización '+str(exchange)+' ARS/USD. Precio 3% bajo techo competitivo, redondeado hacia abajo. Diferencia antes de flete, internación, comisiones y otros gastos todavía no confirmados: no es ganancia neta. Sin comparable suficiente: 25% sobre compra sólo como propuesta provisional de borrador, nunca precio certificado para publicar.</p><input placeholder="Buscar modelo, color o SKU" oninput="document.querySelectorAll(\'tbody tr\').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(this.value.toLowerCase()))"><table><thead><tr>'+''.join('<th>'+v+'</th>' for v in ['SKU','Producto','Compra USD','Reventa USD','Reventa ARS','Diferencia ARS','Recargo %','Estado','Pendientes'])+'</tr></thead><tbody>'+table+'</tbody></table></html>',encoding='utf8')
print(json.dumps({'products':len(rows),'eligible':sum(r['eligible'] for r in rows),'drafts':sum(not r['eligible'] for r in rows),'fx':exchange,'reasons':{p:sum(p in r['pending'] for r in rows) for p in set(p for r in rows for p in r['pending'])}},ensure_ascii=False))

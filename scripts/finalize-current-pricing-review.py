"""Record the authorized price publication and verification without further DB writes."""
import json,csv,shutil,html,sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/pricing-review-2026-10-02'
for src,dst in [('productos.json','productos-propuestas.json'),('revision.html','revision-propuestas.html')]:
 if not (OUT/dst).exists():shutil.copyfile(OUT/src,OUT/dst)
rows=json.loads((OUT/'productos-propuestas.json').read_text(encoding='utf8'))
after=json.loads((OUT/'catalog-after.json').read_text(encoding='utf8'));ps={p['id']:p for p in after['products']}
changes=json.loads((OUT/'price-changes-proposed.json').read_text(encoding='utf8'));ids={p['id'] for p in changes}
for r in rows:
 r['precio_anterior_ars']=r['precio_actual_ars'];r['precio_actual_ars']=ps[r['id']]['retail_price']
 r['actualizado_en_tienda']=r['id'] in ids
 if r['actualizado_en_tienda']:
  assert r['precio_actual_ars']==r['precio_propuesto_ars']
  r['estado']='Aplicado';r['motivo']='Autorizado por el dueño y verificado en la API pública. Referencia ML indexada; gastos pendientes.'
extra=json.loads((OUT/'additional-product.json').read_text(encoding='utf8'));p=extra['product']
r={k:None for k in rows[0]};r.update(id=p['id'],sku=p['sku'],producto=p['title'],publicado=p['is_active'],precio_actual_ars=p['retail_price'],precio_anterior_ars=p['retail_price'],mayorista_usd=extra['supplier_usd'],cotizacion_ars_usd=1550,compra_ars=extra['purchase_ars'],estado='Pendiente',motivo=extra['reason']+' Búsqueda ML con precios contradictorios de listados; falta ficha comparable suficiente.',url_tienda='https://myaimportaciones.vercel.app/producto/'+p['slug'],url_mayorista=p['source_url'],disponibilidad_mayorista=extra['quantity'],actualizado_en_tienda=False,gastos_confirmados=False,fecha_consulta_ML='2026-10-02')
rows.append(r)
for row in rows:
 row['diferencia_actual_venta_compra_ars']=round(row['precio_actual_ars']-row['compra_ars'],2) if row['compra_ars'] is not None and row['precio_actual_ars']>0 else None
 row['margen_actual_sobre_venta_pct']=round(row['diferencia_actual_venta_compra_ars']/row['precio_actual_ars']*100,2) if row['diferencia_actual_venta_compra_ars'] is not None else None
 if row['publicado'] and row['diferencia_actual_venta_compra_ars'] is not None and row['diferencia_actual_venta_compra_ars']<=0:
  row['motivo']+=' Precio actual no cubre la compra según la cotización consultada.'
assert len(rows)==215 and len({r['id'] for r in rows})==215 and sum(r['actualizado_en_tienda'] for r in rows)==85
with (OUT/'productos.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter=';');w.writeheader();w.writerows(rows)
(OUT/'productos.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
summary=json.loads((OUT/'resumen.json').read_text(encoding='utf8'));summary.update(total=215,publicados=170,mayorista_actual=214,productos_agregados_durante_revision=1,precios_modificados_en_tienda=85,precios_verificados_api_publica=85,pendientes=126,sin_ML=90,nota='85 precios publicados con autorización expresa y comprobados en la API pública. Referencias ML indexadas; gastos sin confirmar. Un producto agregado durante la revisión se auditó sin modificarlo.')
(OUT/'resumen.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
money=lambda v:'—' if v is None else '$ '+f'{v:,.2f}'.replace(',','@').replace('.',',').replace('@','.')
s=BeautifulSoup((OUT/'revision-propuestas.html').read_text(encoding='utf8'),'html.parser')
existing=s.select('tbody tr')
for tr,r in zip(existing,rows):
 tr['data-state']=r['estado'];td=tr.select('td')[1];td.clear();td.append(money(r['precio_actual_ars']));small=s.new_tag('small');small.string='Antes: '+money(r['precio_anterior_ars']);td.append(small)
 margin=tr.select('td')[5];margin.clear();margin.append(money(r['diferencia_actual_venta_compra_ars']));small=s.new_tag('small');small.string='Antes de gastos';margin.append(small)
 last=tr.select('td')[-1];last.clear();badge=s.new_tag('span',attrs={'class':'badge '+r['estado']});badge.string=r['estado'];last.append(badge);small=s.new_tag('small');small.string=r['motivo'];last.append(small)
tr=s.new_tag('tr',attrs={'data-state':'Pendiente','data-active':'1'})
for text in [p['title'],money(p['retail_price']),f"USD {extra['supplier_usd']} · compra {money(extra['purchase_ars'])}",'—','—',money(rows[-1]['diferencia_actual_venta_compra_ars']),rows[-1]['motivo']]:
 td=s.new_tag('td');td.string=text;tr.append(td)
s.select_one('tbody').append(tr)
s.select('th')[1].string='MYA actual / anterior'
s.select('th')[5].string='Venta actual−compra'
paras=s.select('body > p') if s.body else s.select('p')
for para in s.select('p'):
 if 'Propuestas sin publicar.' in para.get_text():
  para.clear();para.append('85 precios publicados con autorización expresa: 29 subas y 56 bajas. Todos coinciden con la API pública; también se comprobaron tres fichas, incluida la Jelly Cream. Se conservan los 45 borradores y todos los costos, existencias y modos de abastecimiento. Mercado Libre se consultó mediante búsqueda indexada; los precios pueden tener demora. No se certifica el mínimo absoluto del mercado ni ganancia neta. Un Bare Vanilla agregado durante la revisión se incluyó sin alterar su precio.')
 if 'No se modificaron costos, precios, disponibilidad' in para.get_text():
  para.clear();link=s.new_tag('a',href='productos.csv');link.string='Descargar CSV completo';para.append(link);para.append('. Se actualizaron únicamente los 85 precios autorizados. Costos, disponibilidad, pedidos y borradores se conservaron. Respaldos y comprobaciones están en esta carpeta.')
for box,(count,label) in zip(s.select('.stats div'),[(215,'Productos revisados'),(170,'Publicados'),(214,'Con costo actual'),(125,'Con candidato ML'),(85,'Precios actualizados'),(126,'Pendientes')]):
 box.clear();b=s.new_tag('b');b.string=str(count);box.append(b);box.append(label)
option=s.new_tag('option');option.string='Aplicado';s.select_one('#state').append(option)
s.select_one('style').append('.Aplicado{background:#c9e8d6}')
(OUT/'revision.html').write_text(str(s),encoding='utf8')
assert len(s.select('tbody tr'))==215
print(json.dumps(summary,ensure_ascii=False))

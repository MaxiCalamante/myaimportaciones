"""Prepare the requested combined hammer drill/screwdriver tiers."""
import json, math, uuid, sys
from pathlib import Path
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parents[1]
out=root/'docs/tools-percutores-2026-10-06'
before=json.loads((out/'before.json').read_text(encoding='utf8'))
source=json.loads((out/'candidates.json').read_text(encoding='utf8'))
market=json.loads((out/'market-live.json').read_text(encoding='utf8'))
template=json.loads((root/'docs/tools-additions-2026-10-06/payload.json').read_text(encoding='utf8'))
stamp=datetime.now(timezone.utc).isoformat()
updates=[]
for model,sku,tier,torque in [('TIDLI20558','527354','Media',55),('TIDLI20668','518635','Profesional',66)]:
 old=next(p for p in before['products'] if p['model']==model)
 assert source[sku]['availability']=='in stock'
 title=f'Total Taladro percutor y atornillador brushless 20V {torque}Nm {model}'
 description=f'Gama {tier.lower()}: taladro percutor y atornillador de 20V con motor sin escobillas y torque máximo de {torque} Nm. Sus tres modos permiten atornillar con regulación de torque, perforar madera o metal y perforar mampostería con percusión y la broca adecuada. Tiene mandril metálico de 13 mm, dos velocidades mecánicas, selector 22+1+1, reversa y luz LED.\nIncluye dos baterías Total de 20V y 2,0 Ah, cargador TFCLI2001 para 220–240V, 47 accesorios y tres brocas para mampostería.\nConsultá disponibilidad y condiciones de entrega antes de comprar.'
 specs={**old['specifications'],'Gama':tier,'Funciones':'Taladro, atornillador y taladro percutor','Torque máximo':f'{torque} Nm','Voltaje':'20V','Mandril':'Metálico de 13 mm','Motor':'Sin escobillas','Velocidad sin carga':'0–500 / 0–2.000 rpm','Impactos máximos':'30.000 por minuto','Regulación de torque':'22+1+1','Baterías incluidas':'2 × 20V 2,0 Ah TFBLI20011','Cargador incluido':'TFCLI2001, 220–240V, 50/60 Hz','Versión':tier}
 tags=list(dict.fromkeys(old['tags']+['Taladros percutores y atornilladores','Atornilladores','Gama '+tier.lower()]))
 updates.append({'id':old['id'],'model':model,'slug':old['slug'],'retail_price':old['retail_price'],'old_title':old['title'],'title':title,'description':description,'specifications':specs,'tags':tags})
s=source['60578']
assert s['availability']=='in stock' and s['usd'] and s['iva'] and market['model']=='TIDLI12206'
assert not any(p['model']=='TIDLI12206' or p['sku']=='60578' for p in before['products'])
slug='total-taladro-percutor-y-atornillador-12v-20nm-tidli12206'
pid=str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/producto/'+slug))
price=math.floor(market['price']*.9/100)*100
purchase=round(s['usd']*1545,2)
assert price>purchase
p={**template['products'][0],'id':pid,'category_id':next(c['id'] for c in before['categories'] if c['slug']=='taladros-rotomartillos'),'title':'Total Taladro percutor y atornillador 12V 20Nm TIDLI12206','slug':slug,'model':'TIDLI12206','sku':'60578','retail_price':price,'source_url':s['url'],'image_url':s['images'][0],'image_urls':s['images'],'supplier_last_checked_at':s['checked_at'],'supplier_live_price':purchase,'tags':['Total','Herramientas','Taladros percutores y atornilladores','Atornilladores','Gama baja'],'description':'Gama baja o de entrada: taladro percutor y atornillador compacto de 12V para tareas del hogar, armado de muebles y mantenimiento. Tiene tres modos: atornillado con selector de torque, perforación y perforación con percusión para mampostería con la broca adecuada. Entrega hasta 20 Nm, con dos velocidades mecánicas, mandril sin llave de 10 mm, regulación 18+1+1, reversa y luz LED.\nIncluye dos baterías de 1,5 Ah con puerto de carga USB-C, una punta Cr-V de 65 mm, tres brocas para mampostería y maletín plástico. No incluye cargador.\nConsultá disponibilidad y condiciones de entrega antes de comprar.','specifications':{'Gama':'Baja / entrada','Funciones':'Taladro, atornillador y taladro percutor','Voltaje':'12V','Torque máximo':'20 Nm','Mandril':'Sin llave, 0,8–10 mm','Velocidad sin carga':'0–400 / 0–1.500 rpm','Impactos máximos':'22.500 por minuto','Regulación de torque':'18+1+1','Baterías incluidas':'2 × 12V 1,5 Ah','Carga':'Puerto USB-C en las baterías; cargador no incluido','Accesorios':'Punta Cr-V de 65 mm y 3 brocas para mampostería','Presentación':'Maletín plástico'}}
cost={**template['costs'][0],'product_id':pid,'origin_cost':s['usd'],'exchange_rate':1545,'supplier_url':s['url'],'verified_at':s['checked_at'],'ml_price':market['price'],'ml_url':market['url'],'ml_checked_at':market['checkedAt'],'source_document':f'Alta de taladro percutor y atornillador solicitada por el dueño el 06/10/2026. Proveedor CON IVA USD {s["usd"]}; blue venta 1545 ARS/USD, DolarAPI actualizado 2026-10-06T15:51:00Z. Compra ARS {purchase}. ML principal ARS {market["price"]}, {market["seller"]}, mismo kit USB-C con dos baterías 1,5 Ah, maletín y accesorios, sin cargador. Venta=90% ML redondeado hacia abajo a ARS100. Diferencia previa a gastos ARS {round(price-purchase,2)}; margen de entrada estrecho, no ganancia neta. Flete, internación y comisiones desconocidos; expenses_confirmed=false y ceros obligatorios no significan gastos gratuitos. Stock del proveedor, sin stock propio confirmado. Fuentes y costos privados.'}
def literal(v):return "'"+v.replace("'","''")+"'"
def insert(table,rows):
 cols=list(rows[0])
 types={c:('uuid' if c in ['id','product_id','category_id'] else 'boolean' if isinstance(rows[0][c],bool) else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in cols}
 return f"insert into public.{table}({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({literal(json.dumps(rows,ensure_ascii=False))}::jsonb) as x({','.join(c+' '+types[c] for c in cols)});"
sql=['begin;',insert('products',[p]),insert('product_costs',[cost])]
for u in updates:
 sql.append(f"update public.products set title={literal(u['title'])},description={literal(u['description'])},tags=ARRAY[{','.join(literal(t) for t in u['tags'])}]::text[],specifications={literal(json.dumps(u['specifications'],ensure_ascii=False))}::jsonb,updated_at=now() where id={literal(u['id'])}::uuid and title={literal(u['old_title'])} and retail_price={u['retail_price']};")
sql.append('commit;')
(out/'payload.json').write_text(json.dumps({'products':[p],'costs':[cost],'updates':updates},ensure_ascii=False,indent=2),encoding='utf8')
(out/'import.sql').write_text('\n'.join(sql),encoding='utf8')
print(json.dumps({'new':{'model':p['model'],'price':price,'purchase':purchase,'difference_before_expenses':round(price-purchase,2)},'updated':[{'model':u['model'],'price':u['retail_price']} for u in updates]},ensure_ascii=False))

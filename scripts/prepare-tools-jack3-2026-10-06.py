"""Prepare one inactive jack draft; keep missing pricing evidence explicit."""
import json, math, uuid, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parents[1]
out=root/'docs/tools-jack3-2026-10-06'
before=json.loads((out/'before.json').read_text(encoding='utf8'))
source=json.loads((out/'candidates.json').read_text(encoding='utf8'))
template=json.loads((root/'docs/tools-additions-2026-10-06/payload.json').read_text(encoding='utf8'))
s=source['529402']
assert s['availability']=='in stock' and s['usd']==137.5 and s['iva']
assert not any(p['model']=='THT108313' or p['sku']=='529402' for p in before['products'])
pro=next(p for p in before['products'] if p['model']=='THT10834')
pro_cost=next(c for c in before['product_costs'] if c['product_id']==pro['id'])
purchase=round(s['usd']*1545,2)
proposal=math.floor(purchase*float(pro['retail_price'])/(float(pro_cost['origin_cost'])*float(pro_cost['exchange_rate']))/100)*100
slug='total-gato-hidraulico-carrito-3-toneladas-doble-bomba-tht108313'
pid=str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/producto/'+slug))
image='https://totaltools.com.tw/image/cache/catalog/THT108313-550x550w.png.webp'
p={**template['products'][1],'id':pid,'title':'Total Gato hidráulico carrito 3 toneladas doble bomba THT108313','slug':slug,'model':'THT108313','sku':'529402','retail_price':0,'is_active':False,'source_url':s['url'],'image_url':image,'image_urls':[image],'supplier_last_checked_at':s['checked_at'],'supplier_live_price':purchase,'tags':['Total','Herramientas','Automotor','Taller','Elevación','Doble bomba'],'description':'Gato hidráulico tipo carrito con capacidad máxima de 3 toneladas y doble bomba para elevación rápida. Su rango de elevación va de 130 a 465 mm, con un recorrido de 335 mm. El formato con ruedas permite ubicarlo bajo el punto de elevación indicado por el fabricante del vehículo. Verificá que la capacidad y la altura mínima sean adecuadas para tu vehículo.\nUsalo sobre una superficie firme y nivelada. Para trabajar debajo del vehículo, apoyalo en caballetes adecuados: el gato eleva la carga y no reemplaza un soporte permanente. Los caballetes se venden por separado.\nConsultá disponibilidad y condiciones de entrega antes de comprar.','specifications':{'Capacidad máxima':'3 toneladas','Formato':'Carrito hidráulico','Bomba':'Doble, elevación rápida','Altura mínima':'130 mm','Altura máxima':'465 mm','Recorrido':'335 mm','Peso declarado por Total':'29,5 kg','Caballetes':'No incluidos'}}
cost={**template['costs'][1],'product_id':pid,'origin_cost':s['usd'],'exchange_rate':1545,'supplier_url':s['url'],'verified_at':s['checked_at'],'ml_price':None,'ml_url':None,'ml_checked_at':None,'source_document':f'Borrador solicitado por el dueño el 06/10/2026, pendiente de precio comercial. Proveedor CON IVA USD {s["usd"]}; blue venta ARS1545/USD, DolarAPI actualizado 2026-10-06T15:51:00Z. Compra ARS {purchase}. No se encontró referencia exacta de ML: el catálogo MLA27142144 corresponde a 85–515 mm, no al THT108313 de 130–465 mm. GSMART exacto ARS421000 sin stock, descuento por transferencia condicionado, no usado como referencia ML. Propuesta opcional ARS{proposal} por el mismo recargo venta/compra que el THT10834 publicado, NO es ML menos10%; requiere decisión del dueño antes de activación. Diferencia propuesta menos compra ARS{proposal-purchase} antes de gastos, no neta. Flete, internación y comisiones desconocidos, expenses_confirmed=false; ceros obligatorios no significan gastos gratuitos. Foto del proveedor ilustrativa dice80mm y se descartó; foto y ficha del distribuidor oficial Total Taiwán coinciden en130–465mm,29.5kg. Stock propio0, disponibilidad del proveedor. THT10832 estándar agotado y sin cotizaciónUSD: pendiente, no publicado.'}
payload={'products':[p],'costs':[cost],'proposal':{'model':p['model'],'retail_price':proposal,'method':'Same sale/purchase ratio as existing THT10834; pricing exception pending owner decision','purchase_ars':purchase,'difference_before_expenses':round(proposal-purchase,2),'exact_ml_reference':None},'standard_pending':{'model':'THT10832','sku':'441032','reason':'Supplier out of stock and no current USD quote','source_url':source['441032']['url']}}
(out/'payload.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'model':p['model'],'active':False,'stored_retail_price':0,'proposal':proposal,'purchase':purchase,'difference_before_expenses':round(proposal-purchase,2)},ensure_ascii=False))

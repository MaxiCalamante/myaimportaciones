"""Prepare an exact-model, ML minus 10% catalog expansion; no database writes."""
import json, math, re, unicodedata, uuid, sys
from pathlib import Path
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-expansion-2026-10-02'
source=json.loads((OUT/'candidates.json').read_text(encoding='utf8'))
before=json.loads((OUT/'before.json').read_text(encoding='utf8'))
cats={c['slug']:c['id'] for c in before['categories']}
stamp=datetime.now(timezone.utc).isoformat()
items=[
dict(sku='518680',model='TAPLI2015',name='Pulidora 20V 150 mm',category='amoladoras-pulidoras',ml=230000,url='https://listado.mercadolibre.com.ar/pulidora-orbital-auto',
 description='Pulidora inalámbrica para trabajos de pulido y terminación en superficies de vehículos. El plato de 150 mm permite trabajar sectores delimitados y la velocidad variable ayuda a adaptar el movimiento al producto de pulido y al acabado. Tiene motor sin escobillas y trabaja entre 2.000 y 4.500 rpm. Elegí la almohadilla y el compuesto adecuados para cada superficie.\nIncluye un bonete de pulido. No incluye batería ni cargador: se venden por separado. Consultá compatibilidad si ya tenés baterías Total 20V.',
 specs={'Alimentación':'Batería Total 20V, no incluida','Motor':'Sin escobillas','Diámetro de pulido':'150 mm','Velocidad sin carga':'2.000–4.500 rpm, variable','Incluye':'1 bonete de pulido','No incluye':'Batería y cargador'},tags=['Pulido automotor','Taller','Terminaciones']),
dict(sku='553612',model='TOPLI202548',name='Lustradora orbital 20V 254 mm',category='amoladoras-pulidoras',ml=169000,url='https://www.mercadolibre.com.ar/lustra-pulidora-de-auto-orbital-inalambrica-total-20v-motor-sin-carbones-10-pulgadas-254mm-no-incluye-bateria-ni-cargador-topli202548/p/MLA53771823',
 description='Lustradora orbital inalámbrica para aplicar y trabajar productos de pulido y lustre sobre superficies de vehículos. Su plato de 254 mm cubre sectores amplios, como capó y paneles, y el movimiento orbital tiene una excentricidad de 5 mm. Funciona a 2.500 rpm con motor sin escobillas. Usá el bonete y el compuesto adecuados al acabado; comprobá el resultado primero en una zona pequeña.\nIncluye un bonete de lana y uno de tela. No incluye batería ni cargador: requiere una batería Total 20V compatible.',
 specs={'Alimentación':'Batería Total 20V, no incluida','Movimiento':'Orbital','Motor':'Sin escobillas','Diámetro de pulido':'254 mm (10 pulgadas)','Velocidad sin carga':'2.500 rpm','Excentricidad':'5 mm','Incluye':'1 bonete de lana y 1 de tela','No incluye':'Batería y cargador'},tags=['Lustrado automotor','Taller','Hogar']),
dict(sku='521376',model='THT571001',name='Cortadora de cerámicos 1000 mm',category='albanileria-pintura',ml=266849.30,url='https://www.mercadolibre.com.ar/cortadora-ceramica-porcelanato-azulejos-total-1000mm-cortes-super-precisos/p/MLA44959650',
 description='Cortadora manual para preparar piezas cerámicas durante la colocación de pisos y revestimientos. Permite cortes rectos y diagonales, con una longitud máxima de corte de 1.000 mm y un espesor máximo de 16 mm. El sistema utiliza una rueda de carburo de tungsteno de 22 × 6 × 2 mm y una base de acero de 1.220 × 200 mm. La capacidad efectiva depende del material y del formato de la pieza; verificá su aptitud antes de trabajar porcelanatos especiales.\nIncluye bolsa de transporte. Funciona manualmente, sin alimentación eléctrica. Peso neto: 13,2 kg.',
 specs={'Funcionamiento':'Manual','Longitud máxima de corte':'1.000 mm','Espesor máximo':'16 mm','Tipos de corte':'Recto y diagonal','Rueda de corte':'Carburo de tungsteno, 22 × 6 × 2 mm','Base':'Acero, 1.220 × 200 mm','Peso neto':'13,2 kg','Incluye':'Bolsa de transporte'},tags=['Cerámicos','Colocación de pisos','Construcción']),
dict(sku='609586',model='TLL3012165',name='Nivel láser 20V 12 líneas 35 m con 2 baterías',category='niveles-laser-medicion',ml=450000,url='https://listado.mercadolibre.com.ar/nivel-l%C3%A1ser-total-360',
 description='Nivel láser para trasladar referencias horizontales y verticales en la colocación de revestimientos, muebles, cielorrasos y trabajos de obra. Proyecta un plano horizontal de 360° y dos verticales de 360°, con 12 líneas y alcance declarado de hasta 35 m. Tiene autonivelación hasta 4° y precisión de línea de ±1,5 mm a 7 m. El alcance útil depende de la iluminación y de las condiciones del lugar; no reemplaza a un distanciómetro para medir longitudes.\nIncluye 2 baterías Total 20V de 2,0 Ah TFBLI20011, cargador TFCLI2001, base magnética giratoria elevada, base con 3 patas ajustables, control remoto y caja de transporte. Cargador para 220–240V, 50/60 Hz.',
 specs={'Alimentación':'Total 20V','Proyección':'12 líneas: 1 plano horizontal y 2 verticales de 360°','Alcance declarado':'Hasta 35 m','Autonivelación':'Hasta 4°','Precisión de línea':'±1,5 mm a 7 m','Clase de láser':'II, potencia menor a 1 mW','Temperatura de uso':'0 a 40 °C','Baterías incluidas':'2 × 20V 2,0 Ah, TFBLI20011','Cargador incluido':'TFCLI2001, 220–240V, 50/60 Hz','Otros accesorios':'Bases giratorias magnética y con 3 patas, control remoto y caja'},tags=['Nivelación','Cerámicos','Construcción','Instalaciones']),
dict(sku='487412',model='TH217068',name='Martillo demoledor 1700W 50J',category='taladros-rotomartillos',ml=599000,url='https://listado.mercadolibre.com.ar/martillo-demoledor-total-1700w',
 description='Martillo demoledor eléctrico para romper hormigón y retirar material en tareas de demolición y reformas. Entrega 50 J de energía de impacto, con motor de 1.700 W y frecuencia de 1.900 impactos por minuto. Utiliza encastre hexagonal y pesa 14 kg: tené en cuenta el peso para el tipo y la duración del trabajo. Está destinado a demolición, no al uso como taladro de perforación.\nIncluye un cincel, un juego adicional de escobillas de carbón y maletín de transporte. Alimentación de 220–240V, 50/60 Hz.',
 specs={'Potencia':'1.700 W','Energía de impacto':'50 J','Frecuencia de impacto':'1.900 impactos/min','Encastre':'Hexagonal','Alimentación':'220–240V, 50/60 Hz','Peso':'14 kg','Incluye':'1 cincel, 1 juego adicional de escobillas de carbón y maletín'},tags=['Demolición','Construcción','Reformas']),
]
def slug(s):
 s=''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
 return re.sub('[^a-z0-9]+','-',s).strip('-')
products=[];costs=[];selected=[]
for i in items:
 s=source[i['sku']]; assert s['usd'] and s['iva'] and s['availability']=='in stock' and s['images']
 assert i['model'] in s['title']
 title=f"Total {i['name']} {i['model']}"; key=slug(title)
 pid=str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/producto/'+key))
 assert not any(p['id']==pid or p['slug']==key or p['sku']==i['sku'] or p['model']==i['model'] for p in before['products'])
 price=math.floor(i['ml']*.9/100)*100;purchase=round(s['usd']*1550,2)
 assert price<=i['ml']*.9 and price/purchase>=1.4
 products.append(dict(id=pid,category_id=cats[i['category']],title=title,slug=key,description=i['description']+'\nConsultá disponibilidad y condiciones de entrega antes de comprar.',image_url=s['images'][0],image_urls=s['images'],retail_price=price,wholesale_price=0,wholesale_min_qty=1,stock=0,stock_verified_at=None,brand='Total',model=i['model'],sku=i['sku'],tags=['Total','Herramientas']+i['tags'],is_active=True,is_featured=False,is_wholesale_only=False,source_url=s['url'],fulfillment_mode='supplier',supplier_available=True,supplier_last_checked_at=s['checked_at'],supplier_stock_status='in_stock',supplier_live_price=purchase,specifications=i['specs'],warranty_terms='Consultá las condiciones de garantía y posventa de MYA antes de confirmar la compra.'))
 notes=f"Ampliación autorizada 02/10/2026. Compra directa Paraguay CON IVA USD {s['usd']}; ARS 1550/USD confirmado para esta operación. Referencia argentina mismo modelo y kit ARS {i['ml']}: {i['url']}. Consulta {stamp}; evidencia indexada, puede tener demora; no es mínimo absoluto ni incluye comparación de envío o financiación. Precio venta = ML ×0,90 redondeado hacia abajo a ARS100. Diferencia ARS {round(price-purchase,2)} ANTES de gastos, no ganancia neta. Dueño autoriza publicar con flete desconocido. Flete, internación, comisiones y demás variables pendientes: expenses_confirmed=false; ceros de columnas obligatorias NO significan gastos gratuitos. Disponibilidad proveedor reconfirmar antes de compra; stock propio no verificado. Fotos ilustrativas de la ficha exacta."
 costs.append(dict(product_id=pid,origin_cost=s['usd'],currency='USD',exchange_rate=1550,freight_per_unit=0,other_landed_cost=0,variable_cost=0,payment_fee_percent=0,minimum_contribution=0,expenses_confirmed=False,supplier_url=s['url'],verified_at=s['checked_at'],ml_price=i['ml'],ml_url=i['url'],ml_checked_at=stamp,source_document=notes))
 selected.append(dict(id=pid,sku=i['sku'],model=i['model'],title=title,slug=key,retail_price=price,ml_price=i['ml'],ml_url=i['url'],purchase_ars=purchase,difference_before_expenses=round(price-purchase,2)))
pending=[]
for sku,s in source.items():
 if sku in {i['sku'] for i in items}:continue
 reason='Sin referencia argentina de Mercado Libre suficientemente equivalente y con precio verificable.'
 if s['availability']!='in stock' or not s['usd']:reason='Proveedor sin disponibilidad/cotización actual.'
 if sku in ['313797','505796']:reason='Compra demasiado cercana o superior al objetivo ML menos 10%; diferencia insuficiente antes de envío.'
 if sku in ['164542','580007','528481']:reason='Discrepancia de especificaciones o composición: requiere resolver antes de publicar.'
 pending.append(dict(sku=sku,title=s['title'],reason=reason))
(OUT/'payload.json').write_text(json.dumps(dict(products=products,costs=costs),ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'selection.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'pending.json').write_text(json.dumps(pending,ensure_ascii=False,indent=2),encoding='utf8')
def js(v):return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'::jsonb"
def insert(table,rows):
 cols=list(rows[0]);types={c:('uuid' if c in ['id','product_id','category_id'] else 'boolean' if c in ['is_active','is_featured','is_wholesale_only','supplier_available','expenses_confirmed'] else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in cols}
 return f"insert into public.{table}({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({js(rows)}) as x({','.join(c+' '+types[c] for c in cols)});"
(OUT/'import.sql').write_text('begin;\n'+insert('products',products)+'\n'+insert('product_costs',costs)+'\ncommit;',encoding='utf8')
print(json.dumps(dict(selected=selected,pending=len(pending)),ensure_ascii=False))

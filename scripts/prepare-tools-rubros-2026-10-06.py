"""Prepare the owner's authorized, evidence-backed multi-trade catalog batch."""
import json, math, uuid, sys
from pathlib import Path
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/tools-rubros-2026-10-06'
B=json.loads((OUT/'before.json').read_text(encoding='utf8'))
S=json.loads((OUT/'candidates.json').read_text(encoding='utf8'))
M=json.loads((OUT/'market-live.json').read_text(encoding='utf8'))
T=json.loads((ROOT/'docs/tools-additions-2026-10-06/payload.json').read_text(encoding='utf8'))
stamp=datetime.now(timezone.utc).isoformat()
FX=1545
rows=[]
def add(sku,model,title,slug,category,tier,trades,description,specs,note=''):
 s=S[sku];m=M[model]
 assert s['availability']=='in stock' and s['iva'] and s['usd'] and s['images']
 assert m['price'] and any('Agregar al carrito' in x or 'Comprar ahora' in x for x in m['stockLines'])
 price=math.floor(m['price']*.9/100)*100
 purchase=round(s['usd']*FX,2)
 assert price>purchase and price<=m['price']*.9
 old=next((p for p in B['products'] if p.get('model')==model),None)
 assert old is None or not old['is_active']
 brand='Wadfow' if s['title'].startswith('WADFOW') else 'Total'
 pid=old['id'] if old else str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/producto/'+slug))
 p={**T['products'][0],'id':pid,'category_id':next(c['id'] for c in B['categories'] if c['slug']==category),'title':title,'slug':old['slug'] if old else slug,'description':description+'\nConsultá disponibilidad y condiciones de entrega antes de comprar.','image_url':s['images'][0],'image_urls':s['images'],'retail_price':price,'brand':brand,'model':model,'sku':sku,'tags':[brand,'Herramientas','Gama '+tier,*trades],'source_url':s['url'],'supplier_last_checked_at':s['checked_at'],'supplier_live_price':purchase,'specifications':{'Gama':tier,'Rubros':', '.join(trades),**specs}}
 oldcost=next((c for c in B['product_costs'] if c['product_id']==pid),None)
 cost={**T['costs'][0],'product_id':pid,'origin_cost':s['usd'],'exchange_rate':FX,'verified_at':s['checked_at'],'supplier_url':s['url'],'ml_price':m['price'] if 'mercadolibre.com.ar' in m['url'] else None,'ml_url':m['url'] if 'mercadolibre.com.ar' in m['url'] else None,'ml_checked_at':m['checkedAt'] if 'mercadolibre.com.ar' in m['url'] else None,'source_document':(oldcost['source_document']+'\n' if oldcost and oldcost.get('source_document') else '')+f'Actualización autorizada por el dueño el 06/10/2026: herramientas para distintos rubros y detailing, con gamas y publicación. Proveedor principal SKU {sku}, CON IVA USD {s["usd"]}, consultado {s["checked_at"]}. DolarAPI blue venta 1545 ARS/USD, actualizado 2026-10-06T16:56:00Z. Compra ARS {purchase}. Referencia final disponible ARS {m["price"]}, fuente {m["url"]}, consultada {m["checkedAt"]}. {m.get("method", "Precio vigente visible en ficha exacta de Mercado Libre")} {note} Venta=90% de referencia redondeado hacia abajo a ARS100. Diferencia previa a gastos ARS {round(price-purchase,2)}; no es ganancia neta. Flete, internación, embalaje y comisiones desconocidos; expenses_confirmed=false. Los ceros obligatorios no significan gastos gratuitos. Stock proveedor, stock propio no confirmado. Evidencia privada en tools-rubros-2026-10-06.'}
 if oldcost:
  for field in ['freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','expenses_confirmed']:
   cost[field]=oldcost[field]
 rows.append({'product':p,'cost':cost,'old':old,'oldcost':oldcost,'reference':m,'purchase':purchase})

add('463898','WHP3A14','Wadfow Hidrolavadora 1400W 110bar WHP3A14','wadfow-hidrolavadora-1400w-110bar-whp3a14','hidrolavadoras-alta-presion','entrada',['Detailing','Lavado de autos','Limpieza'],
 'Hidrolavadora de entrada para lavado de vehículos y limpieza de exteriores. Tiene motor con escobillas de 1.400 W, presión máxima de 110 bar, caudal de 5,6 L/min y parada automática al soltar el gatillo. Es una opción compacta para tareas por períodos de uso, respetando el manual y la superficie a limpiar.\nIncluye pistola de agua, manguera de alta presión de 5 m y conector de entrada. No se ofrece como equipo de trabajo continuo para un lavadero industrial.',
 {'Potencia':'1400 W','Presión máxima':'110 bar','Caudal':'5,6 L/min','Alimentación':'220–240V, 50/60 Hz','Motor':'Con escobillas; bobinado de aluminio','Incluye':'Pistola, manguera de 5 m y conector de entrada','Parada automática':'Sí'})
add('560702','TGT11316','Total Hidrolavadora 1400W 130bar TGT11316','total-hidrolavadora-1400w-130bar-tgt11316','hidrolavadoras-alta-presion','entrada Total',['Detailing','Lavado de autos','Limpieza'],
 'Hidrolavadora de entrada de la línea Total para lavado de vehículos y mantenimiento de exteriores. Combina motor con escobillas de 1.400 W y bobinado de cobre con presión máxima de 130 bar, caudal de 5,5 L/min y parada automática. Usala según los períodos y cuidados indicados en el manual.\nIncluye pistola TGTSG026 y manguera de alta presión de 5 m TGTHPH526.',
 {'Potencia':'1400 W','Presión máxima':'130 bar','Caudal':'5,5 L/min','Alimentación':'220–240V, 50/60 Hz','Motor':'Con escobillas; bobinado de cobre','Incluye':'Pistola TGTSG026 y manguera de 5 m TGTHPH526','Parada automática':'Sí'},'Se comparó la versión argentina TGT11316-4 de 220V y 50/60Hz; mismo equipo y accesorios.')
add('526067','TGT11376','Total Hidrolavadora 2000W 160bar TGT11376','total-hidrolavadora-2000w-160bar-tgt11376','hidrolavadoras-alta-presion','intermedia',['Detailing','Lavado de autos','Limpieza'],
 'Hidrolavadora de gama intermedia para lavado de vehículos, pisos y exteriores. Su motor con escobillas de 2.000 W y bobinado de cobre entrega hasta 160 bar de presión máxima y 6 L/min de caudal. Tiene parada automática al soltar el gatillo.\nIncluye pistola TGTSG026, manguera de alta presión superflexible de 5 m, conector de entrada de agua y recipiente para jabón. El recipiente no se ofrece como un cañón de espuma profesional. Respetá el manual y los períodos de uso del equipo.',
 {'Potencia':'2000 W','Presión máxima':'160 bar','Caudal':'6 L/min','Alimentación':'220–240V, 50/60 Hz','Motor':'Con escobillas; bobinado de cobre','Incluye':'Pistola, manguera superflexible de 5 m, conector y recipiente para jabón','Parada automática':'Sí'},'Se utilizó GSMART ARS309000, más competitivo que la ficha ML disponible ARS570000. No se usó el descuento por transferencia como precio general; referencia argentina adicional autorizada por el dueño.')
add('381352','TGT11226','Total Hidrolavadora de inducción 2000W 150bar TGT11226','total-hidrolavadora-de-induccion-2000w-150bar-tgt11226','hidrolavadoras-alta-presion','superior con inducción',['Detailing','Lavado de autos','Limpieza'],
 'Hidrolavadora de gama superior dentro de esta selección por su motor de inducción con bobinado de cobre. Tiene 2.000 W, presión máxima de 150 bar, caudal de 6 L/min y parada automática. La diferencia de gama está en el motor y la construcción; el número de bar por sí solo no define la calidad.\nIncluye pistola TGTSG026, manguera de alta presión de 5 m TGTHPH526 y recipiente para jabón. Respetá los ciclos del manual: no se promete trabajo industrial continuo.',
 {'Potencia':'2000 W','Presión máxima':'150 bar','Caudal':'6 L/min','Alimentación':'220–240V, 50 Hz','Motor':'Inducción; bobinado de cobre','Incluye':'Pistola, manguera de 5 m y recipiente para jabón','Parada automática':'Sí'},'Modelo argentino de 220V, mismo motor de inducción, caudal y kit. Las publicaciones indexadas inferiores sin stock quedaron excluidas.')
add('487467','TVC14122','Total Aspiradora seco y húmedo 12L 800W TVC14122','total-aspiradora-seco-y-humedo-12l-800w-tvc14122','limpieza-ventilacion','entrada compacta',['Detailing','Limpieza','Mantenimiento'],
 'Aspiradora compacta para seco y húmedo, útil para limpieza de interiores de vehículos, locales y mantenimiento. Tiene tanque metálico de 12 L, motor con bobinado de cobre de 800 W, flujo de aire de 1,7 m³/min y vacío de 16 kPa.\nEs una aspiradora de seco y húmedo; no incorpora un sistema de inyección y extracción de tapizados. Para aspirar líquidos usá la configuración y los filtros indicados en el manual.',
 {'Capacidad':'12 L','Potencia':'800 W','Alimentación':'220–240V, 50/60 Hz','Tanque':'Metálico','Flujo de aire':'1,7 m³/min','Vacío':'16 kPa','Uso':'Seco y húmedo; no es inyectora-extractora'})
add('564977','TAPLI1676','Total Mini pulidora brushless 16V 76mm kit 2 baterías TAPLI1676','total-mini-pulidora-brushless-16v-76mm-kit-2-baterias-tapli1676','amoladoras-pulidoras','especializada compacta',['Detailing','Pulido','Carpintería'],
 'Mini pulidora rotativa inalámbrica para pulido y acabado en zonas pequeñas o de acceso limitado. Su motor sin escobillas de 16V trabaja con plato de 76 mm, velocidad variable y dos rangos sin carga: 0–2.800 y 0–8.300 rpm. La velocidad, el accesorio y el compuesto deben ser adecuados para cada superficie.\nIncluye plato con cierre por contacto, almohadilla de esponja, almohadilla de lana, tres lijas, dos baterías M16 de 2,0 Ah TFBLI1620 y cargador M16 TFCLI1613 de 220–240V. Las baterías M16 no reemplazan las P20S de 20V.',
 {'Voltaje':'16V M16','Motor':'Sin escobillas','Formato':'Rotativa compacta','Diámetro':'76 mm','Velocidad sin carga':'0–2800 / 0–8300 rpm','Rosca':'5/16 pulgada','Baterías incluidas':'2 × M16 2,0 Ah TFBLI1620','Cargador incluido':'TFCLI1613, 220–240V, 50/60 Hz','Accesorios':'Plato, esponja, lana y 3 lijas'},'Mismo kit de dos baterías 2Ah y cargador; no se comparó la máquina sola. Maletín no prometido por la ficha del proveedor.')
add('239646','TL7508226','Total Cepillo eléctrico para madera 750W 82mm TL7508226','total-cepillo-electrico-para-madera-750w-82mm-tl7508226','cepillos-fresadoras','entrada con cable',['Carpintería','Montaje de muebles'],
 'Cepillo eléctrico con cable para rebajar, ajustar y alisar piezas de madera. Tiene motor de 750 W, velocidad sin carga de 17.000 rpm, ancho de cepillado de 82 mm y profundidad de hasta 2 mm. La base y la cubierta lateral son de aluminio.\nIncluye guía paralela, llave de tubo y un juego adicional de escobillas de carbón.',
 {'Potencia':'750 W','Alimentación':'220–240V, 50/60 Hz','Velocidad sin carga':'17000 rpm','Ancho de cepillado':'82 mm','Profundidad máxima':'2 mm','Incluye':'Guía paralela, llave y juego adicional de escobillas'},'Se tomó la oferta pública del mismo catálogo TL7508226 de PAOTGUERRERO ARS138221, con botones de compra habilitados; la oferta seleccionada de ARS159000 y las superiores no se usaron.')
add('529242','TRLI20401','Total Cepillo inalámbrico para madera 20V 82mm sin batería TRLI20401','total-cepillo-inalambrico-para-madera-20v-82mm-sin-bateria-trli20401','cepillos-fresadoras','intermedia inalámbrica',['Carpintería','Montaje de muebles','Mantenimiento'],
 'Cepillo inalámbrico de 20V para ajustes y terminación de madera con libertad de movimiento. Trabaja a 14.000 rpm sin carga, con ancho de 82 mm y profundidad máxima de 2 mm. Tiene base y cubierta lateral de aluminio.\nIncluye guía paralela y llave de tubo. La batería y el cargador se venden por separado; tené en cuenta ambos para armar un equipo listo para usar.',
 {'Voltaje':'20V','Velocidad sin carga':'14000 rpm','Ancho de cepillado':'82 mm','Profundidad máxima':'2 mm','Batería y cargador':'No incluidos','Incluye':'Guía paralela y llave de tubo'},'Referencia exacta S2 ARS217050 con título explícito sin batería ni cargador; se descartaron combos con baterías.')
add('486118','TMLI2022','Total Multiherramienta oscilante 20V sin batería TMLI2022','total-multiherramienta-oscilante-20v-sin-bateria-tmli2022','sierras-corte','intermedia versátil',['Carpintería','Instalaciones','Mantenimiento'],
 'Multiherramienta oscilante inalámbrica para cortes localizados, lijado y raspado en tareas de carpintería, instalación y mantenimiento, con el accesorio adecuado. Tiene seis velocidades ajustables y cambio rápido de hoja.\nIncluye raspador flexible, hoja de corte, hoja de sierra segmentada, base de lijado, tres lijas y llave hexagonal. La batería y el cargador se venden por separado.',
 {'Voltaje':'20V','Velocidades':'6 ajustables','Cambio de hoja':'Rápido','Batería y cargador':'No incluidos','Incluye':'Raspador, 2 hojas, base de lijado, 3 lijas y llave hexagonal'})
add('380881','TFBLI20021','Total Batería P20S 20V 4Ah TFBLI20021','total-bateria-p20s-20v-4ah-tfbli20021','baterias-cargadores-litio','4Ah',['Carpintería','Mantenimiento','Herramientas inalámbricas'],
 'Batería de litio-ion de 20V y 4,0 Ah para la plataforma Total P20S. Tiene indicador LED de carga y permite compartir una batería entre herramientas compatibles de esa plataforma.\nSe vende una batería. Cargador y herramientas no incluidos. No es compatible con la plataforma M16 de 16V ni con la línea Total de 42V.',
 {'Voltaje':'20V','Capacidad':'4,0 Ah','Plataforma':'Total P20S','Indicador de carga':'LED','Presentación':'1 batería','Cargador':'No incluido'})
add('521406','TLL156601','Total Nivel láser verde 2 líneas 35m TLL156601','total-nivel-laser-verde-2-lineas-35m-tll156601','niveles-laser-medicion','entrada',['Instalaciones','Construcción','Carpintería'],
 'Nivel láser verde de entrada para replanteo, montaje de muebles e instalaciones. Proyecta una línea horizontal y una vertical, con alcance de trabajo de hasta 35 m y precisión declarada de ±1,5 mm a 7 m.\nFunciona con tres pilas AA LR6 de 1,5V. La ficha incluye soporte magnético y bolso de lona; las pilas no se prometen como incluidas. La visibilidad depende de la luz y el entorno.',
 {'Haz':'Verde','Líneas':'1 horizontal y 1 vertical','Alcance':'Hasta 35 m','Precisión':'±1,5 mm a 7 m','Alimentación':'3 × AA LR6 de 1,5V','Incluye':'Soporte magnético y bolso de lona'},'La ficha ML contiene un campo AAA contradictorio; se describió AA según la ficha directa del proveedor. No se alteró el kit con pilas no confirmadas.')
add('288576','TLL306502','Total Nivel láser verde 360° 35m TLL306502','total-nivel-laser-verde-360-35m-tll306502','niveles-laser-medicion','intermedia 360°',['Instalaciones','Construcción','Carpintería'],
 'Nivel láser verde de gama intermedia para replanteo y colocación de revestimientos. Proyecta una horizontal de 360° y una vertical, con alcance de hasta 35 m y precisión de ±1,5 mm a 7 m. Tiene autonivelación en un rango de hasta 4° y puerto de carga USB-C.\nIncluye control remoto, soporte magnético, cable USB-C y bolso de lona. La visibilidad depende de la luz y el entorno.',
 {'Haz':'Verde','Proyección':'1 horizontal 360° y 1 vertical','Alcance':'Hasta 35 m','Precisión':'±1,5 mm a 7 m','Autonivelación':'Hasta 4°','Clase de láser':'II, menor a 1 mW','Carga':'USB-C','Incluye':'Control remoto, soporte magnético, cable USB-C y bolso'})
add('526180','TMT5110004','Total Multímetro Smart True RMS 1000V 9999 cuentas TMT5110004','total-multimetro-smart-true-rms-1000v-9999-cuentas-tmt5110004','electricidad-iluminacion','avanzada Smart',['Electricidad','Electrónica','Mantenimiento'],
 'Multímetro digital Smart para diagnóstico y mediciones eléctricas, con pantalla VA a color, True RMS y 9.999 cuentas. Su modo Smart identifica tensión AC/DC, resistencia y continuidad. También ofrece medición de capacitancia, frecuencia y temperatura, detección NCV y prueba de diodo.\nRangos máximos: 1.000 V DC, 750 V AC y 10 A. Incluye tres pilas AAA LR03. Usá las entradas, puntas y rangos indicados en el manual; los rangos máximos no equivalen a una certificación de seguridad para cualquier instalación.',
 {'Pantalla':'VA a color, 9999 cuentas','Medición':'True RMS','Tensión máxima':'1000 V DC / 750 V AC','Corriente máxima':'10 A','Modo Smart':'Tensión AC/DC, resistencia y continuidad','Funciones':'NCV, capacitancia, frecuencia, temperatura y diodo','Alimentación incluida':'3 pilas AAA LR03'},'ML tiene una descripción errónea de corriente 9999A; se mantuvo 10A según proveedor. Los precios indexados de Pideweb de aproximadamente ARS65000 no estaban vigentes: consulta pública actual ARS109560. Referencia competitiva actual S2 ARS92990.')

enrich=[]
for model,tier,trades in [('TOPLI202548','Entrada / lustrado',['Detailing','Encerado y acabado']),('TAPLI2015','Intermedia / pulido',['Detailing','Pulido']),('WVR2A30','Intermedia / tanque 30 L',['Detailing','Limpieza']),('WVR4A35','Mayor capacidad / tanque 35 L',['Detailing','Limpieza']),('TR111216','Profesional 1600 W',['Carpintería']),('TR111226','Mayor potencia 2200 W',['Carpintería'])]:
 old=next(p for p in B['products'] if p.get('model')==model)
 assert old['is_active']
 enrich.append({'id':old['id'],'model':model,'retail_price':old['retail_price'],'old_title':old['title'],'tags':list(dict.fromkeys(old['tags']+trades+['Gama '+tier])),'specifications':{**old['specifications'],'Gama':tier,'Rubros':', '.join(trades)}})

def literal(v):return "'"+v.replace("'","''")+"'"
def insert(table,data,update=False):
 cols=list(data[0]);sample=data[0]
 typ={c:('uuid' if c in ['id','product_id','category_id'] else 'boolean' if isinstance(sample[c],bool) else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in cols}
 conflict=' on conflict (product_id) do update set '+','.join(c+'=excluded.'+c for c in cols if c!='product_id') if update else ''
 return f"insert into public.{table}({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({literal(json.dumps(data,ensure_ascii=False))}::jsonb) as x({','.join(c+' '+typ[c] for c in cols)}){conflict};"
sql=['begin;']
guards=[{'id':r['old']['id'],'updated_at':r['old']['updated_at']} for r in rows if r['old']]+[{'id':u['id'],'updated_at':next(p['updated_at'] for p in B['products'] if p['id']==u['id'])} for u in enrich]
sql.append(f"do $$ begin if (select count(*) from public.products p join jsonb_to_recordset({literal(json.dumps(guards))}::jsonb) g(id uuid,updated_at timestamptz) on g.id=p.id and g.updated_at=p.updated_at)<>{len(guards)} then raise exception 'Catalog changed since reviewed snapshot'; end if; end $$;")
new=[r['product'] for r in rows if not r['old']]
sql.append(insert('products',new))
for r in rows:
 if r['old']:
  p=r['product']; values=[]
  for k,v in p.items():
   if k in ['id','slug','stock','stock_verified_at']:continue
   if isinstance(v,bool): val='true' if v else 'false'
   elif isinstance(v,(int,float)):val=str(v)
   elif isinstance(v,list):val='ARRAY['+','.join(literal(x) for x in v)+']::text[]'
   elif isinstance(v,dict):val=literal(json.dumps(v,ensure_ascii=False))+'::jsonb'
   else:val='null' if v is None else literal(v)
   values.append(k+'='+val)
  sql.append('update public.products set '+','.join(values)+f",updated_at=now() where id={literal(p['id'])}::uuid;")
sql.append(insert('product_costs',[r['cost'] for r in rows],True))
for u in enrich:
 sql.append(f"update public.products set tags=ARRAY[{','.join(literal(x) for x in u['tags'])}]::text[],specifications={literal(json.dumps(u['specifications'],ensure_ascii=False))}::jsonb,updated_at=now() where id={literal(u['id'])}::uuid;")
sql.append('commit;')
payload={'checkedAt':stamp,'exchangeRate':FX,'rows':rows,'enrich':enrich}
(OUT/'payload.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'import.sql').write_text('\n'.join(sql),encoding='utf8')
print(json.dumps({'new':len(new),'activated':len(rows)-len(new),'gama_updates':len(enrich),'products':[{'model':r['product']['model'],'price':r['product']['retail_price'],'purchase':r['purchase'],'difference_before_expenses':round(r['product']['retail_price']-r['purchase'],2)} for r in rows]},ensure_ascii=False))

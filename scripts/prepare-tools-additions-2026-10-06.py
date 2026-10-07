"""Prepare the owner-requested catalog additions; never write to the database."""
import json, math, re, sys, unicodedata, uuid
from pathlib import Path
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf8')
OUT = Path(__file__).resolve().parents[1] / 'docs/tools-additions-2026-10-06'
source = json.loads((OUT / 'candidates.json').read_text(encoding='utf8'))
before = json.loads((OUT / 'before.json').read_text(encoding='utf8'))
cats = {c['slug']: c['id'] for c in before['categories']}
stamp = datetime.now(timezone.utc).isoformat()
FX = 1545
fx_source = 'https://dolarapi.com/v1/dolares/blue'
items = [
    dict(sku='502016', model='TSDLI08025', name='Atornillador articulado 8V 6Nm con 17 accesorios', category='taladros-rotomartillos', ml=96000,
         ml_url='https://www.mercadolibre.com.ar/atornillador-8v--17-accesorios-industrial-total-tsdli08025/up/MLAU4406355397', seller='Don Andrés Comercial',
         description='Atornillador inalámbrico compacto para montaje de muebles, ajustes y tareas de mantenimiento. Su mango se puede colocar en dos posiciones para adaptar el agarre al espacio de trabajo. Tiene encastre hexagonal de 1/4 de pulgada, torque máximo de 6 Nm, regulación de torque 15+1 y luz LED integrada. Gira a 220 rpm; está orientado a atornillado controlado y trabajos livianos.\nIncluye 17 accesorios: 10 puntas Cr-V de 25 mm, un conector de 60 mm, cuatro brocas HSS de vástago hexagonal y dos puntas Cr-V adicionales. Se entrega en caja plástica. Carga mediante USB-C; el cable de carga se vende por separado.',
         specs={'Voltaje':'8V','Torque máximo':'6 Nm','Velocidad sin carga':'220 rpm','Encastre':'Hexagonal 6,35 mm (1/4 pulgada)','Regulación de torque':'15+1','Mango':'Articulado, dos posiciones','Iluminación':'LED integrada','Carga':'USB-C; cable no incluido','Incluye':'17 accesorios y caja plástica'}, tags=['Montaje de muebles','Mantenimiento','Atornilladores']),
    dict(sku='301305', model='THT10821', name='Gato hidráulico carrito 2 toneladas', category='gatos-hidraulicos-criques', ml=129299,
         ml_url='https://www.mercadolibre.com.ar/cricket-gato-carrito-hidraulico-2-tn-industrial-total/p/MLA24308196', seller='El Rosarino Ferreteria',
         description='Gato hidráulico tipo carrito para elevar vehículos en tareas de mantenimiento, con capacidad máxima de 2 toneladas. Su rango de elevación va de 140 a 340 mm. El formato con ruedas permite ubicarlo bajo el punto de elevación indicado por el fabricante del vehículo. Verificá que la altura mínima y la capacidad sean adecuadas para tu vehículo.\nUsalo sobre una superficie firme y nivelada. Para trabajar debajo del vehículo, apoyalo en caballetes adecuados: el gato eleva la carga y no reemplaza un soporte permanente. Los caballetes se venden por separado.',
         specs={'Capacidad máxima':'2 toneladas','Formato':'Carrito hidráulico','Altura mínima':'140 mm','Altura máxima':'340 mm','Peso declarado por el proveedor':'9,3 kg','Línea':'Industrial','Caballetes':'No incluidos'}, tags=['Automotor','Taller','Elevación']),
    dict(sku='502276', model='THT10834', name='Gato hidráulico carrito perfil bajo 3 toneladas doble bomba', category='gatos-hidraulicos-criques', ml=389998.99,
         ml_url='https://www.mercadolibre.com.ar/cricket-carrito-3-tn-extra-chato-industrial-total-tht10834/up/MLAU3140783842', seller='IMPEXPRO SHOP',
         description='Gato hidráulico de perfil bajo para elevar vehículos en trabajos de taller y mantenimiento. Tiene capacidad máxima de 3 toneladas y una altura mínima de 85 mm, útil cuando hay poco espacio bajo el punto de elevación. Alcanza hasta 515 mm y utiliza doble bomba para la elevación rápida. El proveedor declara un peso de 32 kg; consideralo al transportarlo o coordinar el envío.\nUsalo sobre una superficie firme y nivelada, en los puntos de elevación indicados para el vehículo. Para trabajar debajo, colocá caballetes adecuados: el gato no reemplaza un soporte permanente. Los caballetes se venden por separado.',
         specs={'Capacidad máxima':'3 toneladas','Formato':'Carrito de perfil bajo','Bombeo':'Doble bomba, elevación rápida','Altura mínima':'85 mm','Altura máxima':'515 mm','Peso declarado por el proveedor':'32 kg','Caballetes':'No incluidos'}, tags=['Automotor','Taller','Elevación','Perfil bajo']),
]

def slug(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub('[^a-z0-9]+', '-', value).strip('-')

products, costs, selected = [], [], []
for item in items:
    supplier = source[item['sku']]
    assert supplier['usd'] and supplier['iva'] and supplier['availability'] == 'in stock' and supplier['images']
    assert item['model'] in supplier['title']
    title = f"Total {item['name']} {item['model']}"
    key = slug(title)
    pid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://myaimportaciones.vercel.app/producto/' + key))
    assert not any(p['id'] == pid or p['slug'] == key or p['sku'] == item['sku'] or p['model'] == item['model'] for p in before['products'])
    price = math.floor(item['ml'] * .9 / 100) * 100
    purchase = round(supplier['usd'] * FX, 2)
    assert price <= item['ml'] * .9 and price / purchase >= 1.4
    products.append(dict(id=pid,category_id=cats[item['category']],title=title,slug=key,description=item['description']+'\nConsultá disponibilidad y condiciones de entrega antes de comprar.',image_url=supplier['images'][0],image_urls=supplier['images'],retail_price=price,wholesale_price=0,wholesale_min_qty=1,stock=0,stock_verified_at=None,brand='Total',model=item['model'],sku=item['sku'],tags=['Total','Herramientas']+item['tags'],is_active=True,is_featured=False,is_wholesale_only=False,source_url=supplier['url'],fulfillment_mode='supplier',supplier_available=True,supplier_last_checked_at=supplier['checked_at'],supplier_stock_status='in_stock',supplier_live_price=purchase,specifications=item['specs'],warranty_terms='Consultá las condiciones de garantía y posventa de MYA antes de confirmar la compra.'))
    notes = f"Alta solicitada por el dueño el 06/10/2026. Compra directa Paraguay CON IVA USD {supplier['usd']}. Conversión con dólar blue VENTA ARS {FX}/USD solicitada por el dueño; {fx_source}, actualización 2026-10-06T13:56:00Z, consulta {stamp}. Referencia ML verificada en navegador, ficha del mismo modelo y kit, precio principal con impuestos ARS {item['ml']}, vendedor {item['seller']}; {item['ml_url']}; consulta 06/10/2026. Venta = ML ×0,90 redondeada hacia abajo a ARS100. Diferencia ARS {round(price-purchase,2)} antes de gastos, no ganancia neta. Flete, internación, comisiones y demás gastos pendientes; expenses_confirmed=false. Ceros de columnas obligatorias no significan gastos gratuitos. Disponibilidad del proveedor, sin stock físico propio confirmado. Referencia de envío: THT10834 entrega a acordar; THT10821 y TSDLI08025 ofrecían envío gratis en ML para el destino del navegador. No se comparó costo total entregado ni financiación. Mantener fuentes y costos privados."
    costs.append(dict(product_id=pid,origin_cost=supplier['usd'],currency='USD',exchange_rate=FX,freight_per_unit=0,other_landed_cost=0,variable_cost=0,payment_fee_percent=0,minimum_contribution=0,expenses_confirmed=False,supplier_url=supplier['url'],verified_at=supplier['checked_at'],ml_price=item['ml'],ml_url=item['ml_url'],ml_checked_at=stamp,source_document=notes))
    selected.append(dict(id=pid,sku=item['sku'],model=item['model'],title=title,slug=key,retail_price=price,ml_price=item['ml'],ml_url=item['ml_url'],ml_verified='browser_exact_product',purchase_ars=purchase,difference_before_expenses=round(price-purchase,2),markup_before_expenses_percent=round((price/purchase-1)*100,2)))

pending = [
    dict(model='TIDLI201668',sku='67690',reason='Gama de 166 Nm con dos baterías de 5 Ah: mayorista sin stock ni cotización vigente. No publicar ni inventar costo.'),
    dict(model='Total botella 3 t',sku=None,reason='No se encontró una ficha exacta en el mayorista. No sustituir por otro carrito de 3 t ni por botella de otra capacidad.'),
    dict(model='UTIDLI209686',sku='5890',reason='Kit de 96 Nm disponible con cargador de 110–120V. No es equivalente al kit argentino de 220–240V.'),
    dict(model='THT108313',sku='529402',reason='Carrito de 3 t disponible pero sin referencia ML argentina del modelo exacto; no añadir otra variante similar.'),
    dict(model='TSDLI0442',sku='3407',reason='Disponible, pero sin comparable ML argentino exacto suficiente para fijar el precio.'),
]
existing = [dict(model=p['model'],slug=p['slug'],retail_price=p['retail_price']) for p in before['products'] if p['model'] in ['TDLI12456','TDLI205582','TIRLI2023','TIRLI2028']]
(OUT/'payload.json').write_text(json.dumps(dict(products=products,costs=costs),ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'selection.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'pending.json').write_text(json.dumps(dict(pending=pending,existing_preserved=existing),ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'fx.json').write_text(json.dumps(dict(currency='USD',rate=FX,side='venta',source=fx_source,updated_at='2026-10-06T13:56:00Z',checked_at=stamp),indent=2),encoding='utf8')

def sql_json(value):
    return "'"+json.dumps(value,ensure_ascii=False).replace("'","''")+"'::jsonb"

def insert(table, rows):
    cols = list(rows[0])
    types = {c: ('uuid' if c in ['id','product_id','category_id'] else 'boolean' if c in ['is_active','is_featured','is_wholesale_only','supplier_available','expenses_confirmed'] else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in cols}
    return f"insert into public.{table}({','.join(cols)}) select {','.join(cols)} from jsonb_to_recordset({sql_json(rows)}) as x({','.join(c+' '+types[c] for c in cols)});"

(OUT/'import.sql').write_text('begin;\n'+insert('products',products)+'\n'+insert('product_costs',costs)+'\ncommit;',encoding='utf8')
print(json.dumps(dict(selected=selected,pending=pending,existing_preserved=existing),ensure_ascii=False))

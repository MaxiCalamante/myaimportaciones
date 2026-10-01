"""Curated expansion: exact presentations, private costs, and supplier availability."""
import json,re,unicodedata,uuid,sys,io
from pathlib import Path
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/cosmetics-completion-2026-10-01'
MEDIA=OUT/'media';MEDIA.mkdir(exist_ok=True)
offers=json.loads((OUT/'known-offers.json').read_text(encoding='utf8'))
before=json.loads((OUT/'before.json').read_text(encoding='utf8'))
FX=1550;STAMP=datetime.now(timezone.utc).isoformat()
# Each row was reviewed against the exact product, size and pack. Indexed market references
# are not a promise of today's lowest marketplace price or proven net earnings.
PICKS=[
 (12,'Celimax Retinal Shot Tightening Booster 15 ml',30900,33000,'https://www.mercadolibre.com.ar/celimax-booster-facial-retinal-shot-tightening-15ml-todo-tipo-de-piel-dia/up/MLAU4540334454','serums-ampollas','15 ml','https://celimax.us/collections/best-sellers',10),
 (45,'Celimax Retinol Shot Tightening Serum 30 ml',34900,36653.76,'https://www.mercadolibre.com.ar/celimax-retinol-shot-tightening-serum-30ml/p/MLA50168759','serums-ampollas','30 ml','https://celimax.us/collections/best-sellers',11),
 (39,'Celimax Dual Barrier Creamy Toner 150 ml',43900,53898.9,'https://www.mercadolibre.com.ar/celimax-dual-barrier-creamy-toner-150ml/up/MLAU3912004985','tonicos-pads','150 ml','https://celimax.us/collections/best-sellers',None),
 (43,'Celimax Noni Energy Ampoule 50 ml',45900,69999,'https://www.mercadolibre.com.ar/celimax-the-real-noni-energy-ampoule-50ml/up/MLAU3711186217','serums-ampollas','50 ml','https://celimax.us/collections/best-sellers',None),
 (41,'Celimax Noni Acne Bubble Cleanser 155 ml',37900,60000,'https://www.mercadolibre.com.ar/celimax-noni-acne-bubble-cleanser-155ml/p/MLA58577816','limpieza-exfoliantes','155 ml','https://celimax.us/collections/best-sellers',None),
 (13,'Numbuzin No.5+ Glutathione Vitamin Toner Pads 70 unidades',55900,78600,'https://www.mercadolibre.com.ar/numbuzin-no5-glutathione-vitamin-concentrated-toner-pads/up/MLAU3937187109','tonicos-pads','70 pads / 180 ml','https://us.numbuzin.com/products/no-5-vitamin-niacinamide-concentrated-toner-pads',None),
 (21,'Dr. Althea 345 Relief Cream Mask 4 unidades',37900,49000,'https://www.mercadolibre.com.ar/dr-althea-345-relief-cream-mask-x-4-unidades/up/MLAU4239749494','mascarillas-faciales','Pack de 4 mascarillas','https://doctoraltheaglobal.com/collections/all-products?page=2',None),
 (22,'Dr. Althea Vitamin C Boosting Serum 30 ml',52900,60300,'https://www.mercadolibre.com.ar/serum-vitamina-c-dr-althea-vitamin-c-boosting-serum-30ml/up/MLAU3435742510','serums-ampollas','30 ml','https://doctoraltheaglobal.com/collections/best-sellers-2',None),
 (28,'Anua PDRN Hyaluronic Acid Hydrating Capsule Mist 100 ml',69900,77099,'https://www.mercadolibre.com.ar/anua-pdrn-hyaluronic-acid-hydrating-capsule-mist-100ml/p/MLA67986535','tonicos-pads','100 ml','https://anua.com/collections/5-by-ingredients',None),
 (8,'Anua Heartleaf Pore Control Cleansing Oil 200 ml',43900,46585,'https://www.mercadolibre.com.ar/anua-heartleaf-pore-control-cleansing-oil-200ml/up/MLAU3148064175','limpieza-exfoliantes','200 ml','https://anua.com/collections/heartleaf-collection',None),
]
PICKS.extend([
 (46,'Tree Hut Coco Colada Shea Sugar Scrub 510 g',38900,50000,'https://www.mercadolibre.com.ar/exfoliante-corporal-tree-hut-coco-colada-510g/p/MLA24297000','lociones-corporales-fragancias','510 g','https://www.treehutshea.com/products/coco-colada-shea-sugar-scrub',None),
 (47,"Victoria's Secret Pure Seduction Body Mist 250 ml",33900,41999,'https://www.mercadolibre.com.ar/body-splash-victorias-secret-pure-seduction-250ml/p/MLA22191362','lociones-corporales-fragancias','250 ml','https://www.victoriassecret.com/us/vs/beauty-catalog/5000011041',None),
])
# Retinal reference is the exact 33,000 ARS catalog listing, not the 35,532 up listing.
PICKS[0]=(*PICKS[0][:4],'https://www.mercadolibre.com.ar/celimax-retinal-shot-tightening-booster-15ml/p/MLA50574653',*PICKS[0][5:])
# Preserve observed marketplace URLs verbatim rather than guessing title-derived paths.
for n,pick in enumerate(PICKS):
 key,title,retail,ml,url,*rest=pick
 raw=(OUT/f'ml-{key}.txt').read_text(encoding='utf8') if key<46 else (OUT/('body-market-2.txt' if key==46 else 'body-market.txt')).read_text(encoding='utf8')
 ident=re.search(r'MLA(?:U)?\d+',url)[0]
 urls=re.findall(r'https://www\.mercadolibre\.com\.ar/[^\s)]+',raw)
 matches=[u for u in urls if ident in u]
 assert matches,(key,ident)
 PICKS[n]=(key,title,retail,ml,matches[0],*rest)

def slug(t):
 t=''.join(c for c in unicodedata.normalize('NFD',t.lower()) if unicodedata.category(c)!='Mn')
 return re.sub('[^a-z0-9]+','-',t).strip('-')
def uid(t):return str(uuid.uuid5(uuid.NAMESPACE_URL,'https://myaimportaciones.vercel.app/'+t))
cats={c['slug']:c['id'] for c in before['categories']}
root=cats['cosmetica-coreana'];newcats=[]
for order,name,s,desc in [(50,'Mascarillas faciales','mascarillas-faciales','Mascarillas de tela, hidrogel y tratamientos faciales.'),(60,'Protección solar','proteccion-solar','Protectores solares faciales en crema, sérum y barra.'),(80,'Dispositivos faciales','dispositivos-faciales','Dispositivos AGE-R y accesorios para el cuidado facial.')]:
 cats[s]=uid('categoria/'+s);newcats.append(dict(id=cats[s],name=name,slug=s,parent_id=root,description=desc,display_order=order,is_wholesale_only=False,image_url=None))

def media(p):
 k=p[0];o=offers[k];r=requests.get(o['image_url'],timeout=40);r.raise_for_status();im=Image.open(io.BytesIO(r.content));assert min(im.size)>100
 ext={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp'}[im.format];data=r.content
 if len(data)>740000:
  b=io.BytesIO();im.save(b,format='WEBP',quality=90);data=b.getvalue();ext='.webp'
 assert len(data)<750000
 filename=f'mya-cosmetics-20261001-{k}'+ext;path=MEDIA/filename;path.write_bytes(data)
 return dict(key=k,path=str(path.resolve()),filename=filename,width=im.width,height=im.height,bytes=len(data),source=o['image_url'],public_url='https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/'+filename)
with ThreadPoolExecutor(max_workers=4) as pool:media_rows=list(pool.map(media,PICKS))
(OUT/'media.json').write_text(json.dumps(media_rows,ensure_ascii=False,indent=2),encoding='utf8')
med={x['key']:x for x in media_rows}
rows=[];costs=[];report=[]
for k,title,retail,ml,mlurl,category,presentation,demand,alternative in PICKS:
 o=offers[k];related=[o]+([offers[alternative]] if alternative is not None else [])
 assert all(o['price']<=x['price'] for x in related) and o['quantity']>0
 pid=uid('producto/'+slug(title));purchase=round(o['price']*FX,2)
 notes=['Cosméticos seleccionados 2026-10-01. FX de catálogo indicado por el usuario: ARS 1550/USD.','Diferencia venta-compra antes de flete, impuestos y comisiones; no representa ganancia neta.','Referencia ML obtenida por búsqueda web con posible demora de indexación; no es un relevamiento exhaustivo del mínimo de Mercado Libre.',f'Referencia de mercado ARS {ml}: {mlurl}',f'Señal de reconocimiento: {demand}. Reseñas/listados de best sellers y ventas declaradas por ML no garantizan demanda futura.']
 for x in related:notes.append(f"{x['supplier']}: USD {x['price']}; cantidad declarada {x['quantity']}; consulta {x['checked_at']}; {x['url']}")
 notes.append('Proveedor elegido por menor costo USD entre ofertas equivalentes relevadas. Stock propio no confirmado. Precio reducido respecto del doble de costo cuando la comparación local lo exige.' if k in [12,8] else 'Recargo aproximado del 100% sobre compra, redondeado comercialmente. Stock propio no confirmado.')
 row=dict(id=pid,category_id=cats[category],title=title,slug=slug(title),description=f'{title}. Presentación: {presentation}. Consultá disponibilidad y condiciones de entrega antes de comprar.',image_url=med[k]['public_url'],image_urls=[med[k]['public_url']],retail_price=retail,wholesale_price=0,wholesale_min_qty=1,stock=0,stock_verified_at=None,brand=o['brand'],model=title.removeprefix(o['brand']+' '),sku=f'MYA-COS-{k:03d}',tags=[o['brand'],'K-beauty'],is_active=True,is_featured=False,is_wholesale_only=False,source_url=o['url'],fulfillment_mode='supplier',supplier_available=True,supplier_last_checked_at=o['checked_at'],supplier_stock_status='available',supplier_live_price=purchase,specifications={'Marca':o['brand'],'Presentación':presentation,'Línea':title.removeprefix(o['brand']+' ')})
 cost=dict(product_id=pid,origin_cost=o['price'],currency='USD',exchange_rate=FX,freight_per_unit=0,other_landed_cost=0,variable_cost=0,payment_fee_percent=0,minimum_contribution=0,expenses_confirmed=False,supplier_url=o['url'],verified_at=o['checked_at'],ml_price=ml,ml_url=mlurl,ml_checked_at=STAMP,source_document='\n'.join(notes))
 rows.append(row);costs.append(cost);report.append(dict(key=k,id=pid,title=title,brand=o['brand'],category=category,usd=o['price'],purchase_ars=purchase,retail_price=retail,difference_before_expenses=retail-purchase,markup_percent=round((retail/purchase-1)*100,2),ml_price=ml,ml_url=mlurl,below_reference_percent=round((1-retail/ml)*100,2),offers=related,demand_source=demand,image_url=med[k]['public_url']))
assert len(rows)==12 and all(r['retail_price']>r['purchase_ars'] for r in report)
(OUT/'selection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')

def classify(title):
 t=title.lower()
 if 'body' in t or 'corporal' in t or 'hair & body mist' in t:return 'lociones-corporales-fragancias'
 if 'shampoo' in t or 'conditioner' in t or 'acondicionador' in t:return 'shampoos-acondicionadores'
 if 'rosemary' in t or 'hair mask' in t:return 'tratamientos-mascarillas-capilares'
 if 'booster pro' in t or 'mini plus' in t or ('wipes' in t and 'age-r' in t):return 'dispositivos-faciales'
 if any(w in t for w in ['sun','spf','uv serum']):return 'proteccion-solar'
 if 'kit' in t or 'travel' in t:return 'kits-de-viaje-k-beauty'
 if 'eye' in t or 'ojos' in t:return 'contorno-ojos'
 if any(w in t for w in ['cleanser','cleansing','limpiador','foam','wipes','peel shot','1min red acne']):return 'limpieza-exfoliantes'
 if any(w in t for w in ['toner','tónico','pad','spray','mist']):return 'tonicos-pads'
 if any(w in t for w in ['mask','mascarilla','wrapping','sleeping pack']):return 'mascarillas-faciales'
 if 'booster gel' in t:return 'cremas-mascarillas'
 if any(w in t for w in ['cream','crema','balm']):return 'cremas-mascarillas'
 return 'serums-ampollas'
assignments=[dict(id=p['id'],category_id=cats[classify(p['title'])],title=p['title'],old_category_id=p['category_id']) for p in before['products']]
(OUT/'category-review.json').write_text(json.dumps(assignments,ensure_ascii=False,indent=2),encoding='utf8')
# Pick a real active product image for each cosmetics category, avoiding stale local filenames.
allproducts=[dict(p,category_id=next(a['category_id'] for a in assignments if a['id']==p['id'])) for p in before['products']]+rows
fixes=json.loads((OUT/'media-fixes.json').read_text(encoding='utf8'))
for p in allproducts:
 fix=next((f for f in fixes if f['id']==p['id']),None)
 if fix:p['image_url']=fix['image_url']
names={'cremas-mascarillas':('Cremas e hidratantes',40,'Cremas, geles y bálsamos para el cuidado facial.'),'limpieza-exfoliantes':('Limpieza y exfoliación',10,'Aceites limpiadores, espumas y exfoliantes faciales.'),'tonicos-pads':('Tónicos, pads y brumas',20,'Tónicos, discos faciales y brumas para el cuidado de la piel.'),'serums-ampollas':('Sérums y ampollas faciales',30,'Sérums y ampollas para la rutina facial.'),'contorno-ojos':('Contorno de ojos',70,'Cremas y sérums para el contorno de ojos.'),'kits-de-viaje-k-beauty':('Kits de cuidado facial',90,'Sets y formatos de viaje para el cuidado facial.'),'lociones-corporales-fragancias':('Cuidado corporal y fragancias',100,'Limpieza corporal, cremas y brumas perfumadas.')}
updates=[]
for c in before['categories']+newcats:
 if c['id']==root or c['parent_id'] in [root,cats['cuidado-capilar']]:
  candidates=[p for p in allproducts if p['is_active'] and (p['category_id']==c['id'] or c['id']==root and p['brand']=='Medicube')]
  if not candidates:continue
  name,order,desc=names.get(c['slug'],(c['name'],c['display_order'],c['description']))
  image=candidates[0]['image_url']
  if c['id']==root:
   image=next(p['image_url'] for p in allproducts if p['title']=='Medicube Collagen Jelly Cream 50 ml')
   desc='Productos de cuidado facial y corporal: sérums, tónicos, cremas, mascarillas, protección solar y dispositivos.'
  if c in newcats:c['image_url']=image
  else:updates.append(dict(id=c['id'],name=name,display_order=order,description=desc,image_url=image))
payload=dict(products=rows,costs=costs,new_categories=newcats,category_updates=updates,assignments=assignments)
(OUT/'payload.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8')
def js(x):return "'"+json.dumps(x,ensure_ascii=False).replace("'","''")+"'::jsonb"
def insert(table,objects):
 columns=list(objects[0]);types={c:('uuid' if c in ['id','product_id','category_id','parent_id'] else 'boolean' if c in ['is_active','is_featured','is_wholesale_only','supplier_available','expenses_confirmed'] else 'numeric' if c in ['retail_price','wholesale_price','origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution','ml_price','supplier_live_price'] else 'integer' if c in ['stock','wholesale_min_qty','display_order'] else 'timestamptz' if c.endswith('_at') else 'jsonb' if c=='specifications' else 'text[]' if c in ['image_urls','tags'] else 'text') for c in columns}
 return f"insert into public.{table}({','.join(columns)}) select {','.join(columns)} from jsonb_to_recordset({js(objects)}) as x({','.join(c+' '+types[c] for c in columns)});"
sql='begin;\n'+insert('categories',newcats)+'\n'+insert('products',rows)+'\n'+insert('product_costs',costs)+'\n'
sql+=f"update public.categories c set name=x.name,display_order=x.display_order,description=x.description,image_url=x.image_url from jsonb_to_recordset({js(updates)}) as x(id uuid,name text,display_order integer,description text,image_url text) where c.id=x.id;\n"
changes=[dict(id=a['id'],category_id=a['category_id']) for a in assignments if a['category_id']!=a['old_category_id']]
sql+=f"update public.products p set category_id=x.category_id from jsonb_to_recordset({js(changes)}) as x(id uuid,category_id uuid) where p.id=x.id;\ncommit;"
sql=sql.replace('commit;',f"update public.products p set image_url=x.image_url,image_urls=array[x.image_url] from jsonb_to_recordset({js([dict(id=f['id'],image_url=f['image_url']) for f in fixes])}) as x(id uuid,image_url text) where p.id=x.id;\ncommit;")
(OUT/'import.sql').write_text(sql,encoding='utf8')
print(json.dumps(dict(new_products=len(rows),category_changes=len(changes),new_categories=len(newcats),images=len(media_rows),selection=[{'title':r['title'],'retail':r['retail_price'],'markup':r['markup_percent']} for r in report]),ensure_ascii=False))

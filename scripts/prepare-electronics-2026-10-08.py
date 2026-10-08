import json,re,uuid,unicodedata
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
rows=json.loads((OUT/'source.json').read_text(encoding='utf8'))
market=json.loads((OUT/'market-tecnoselect.json').read_text(encoding='utf8'))
colors={'AWESOME GRAY GREEN':('Verde grisáceo','graygreen'),'AWESOME CHARCOAL':('Gris carbón','charcoal'),'AWESOME LAVANDER':('Lavanda','lavender'),'AWESOME WHITE':('Blanco','white'),'COSMIC ORANGE':('Naranja cósmico','cosmicorange'),'SPACE BLACK':('Negro espacial','spaceblack'),'SPACE GRAY':('Gris espacial','spacegray'),'DEEP BLUE':('Azul profundo','deepblue'),'NAVY BLUE':('Azul marino','navy'),'SKY BLUE':('Azul cielo','skyblue'),'ICE BLUE':('Azul hielo','icyblue'),'SOFT PINK':('Rosa suave','softpink'),'ULTRAMARINE':('Azul ultramar','ultramarine'),'STARLIGHT':('Blanco estrella','starlight'),'MIDNIGHT':('Medianoche','midnight'),'LAVENDER':('Lavanda','lavender'),'LAVANDER':('Lavanda','lavender'),'BURGUNDY':('Borgoña','burgundy'),'GLACIER':('Glaciar','glacier'),'NATURAL':('Titanio natural','natural'),'CITRUS':('Cítrico','citrus'),'SILVER':('Plata','silver'),'YELLOW':('Amarillo','yellow'),'VIOLETA':('Violeta','lilac'),'PRETO':('Negro','spaceblack'),'BLACK':('Negro','black'),'WHITE':('Blanco','white'),'GREEN':('Verde','green'),'VERDE':('Verde','green'),'ORANGE':('Naranja cósmico','cosmicorange'),'SAGE':('Verde salvia','sage'),'BLUE':('Azul','blue'),'PINK':('Rosa','pink'),'GRAY':('Gris','gray'),'GREY':('Gris','gray')}
colors['TEAL']=('Verde azulado','teal')
colors={'PURPLE':('Violeta','purple'),**colors}
def slug(t):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
for r in rows:
 raw=r['raw'];spec={};notes=[];kind='smartphones';brand='Samsung' if 'SAMSUNG' in raw else 'Apple';part=None
 match=re.search(r'\b([A-Z0-9]{5,}(?:LL|B)/A)\b',raw)
 if match:part=match[1]
 color,color_key=next((v for k,v in colors.items() if re.search(r'\b'+k+r'\b',raw)),('A confirmar','unknown'))
 storage=re.search(r'(?<![A-Z0-9])(\d+)(GB|TB)',raw);capacity=(storage[1]+' '+storage[2]) if storage else ''
 memory=re.search(r'(\d+)/(\d+)(GB|TB)',raw)
 if memory:spec['Memoria RAM']=memory[1]+' GB';capacity=memory[2]+' '+memory[3]
 ram=re.search(r'(\d+)RAM',raw)
 if ram:spec['Memoria RAM']=ram[1]+' GB'
 condition='CPO / reacondicionado' if 'CPO' in raw else 'Activado' if re.search(r'ACTIVAD|ACTIVA| ESIM AC',raw) else 'Nuevo'
 if raw.startswith('IPHONE'):
  family=re.search(r'IPHONE (\d+)(E)?(?: (PRO)(?: (MAX))?)?',raw)
  family='iPhone '+family[1]+('e' if family[2] else '')+(' Pro' if family[3] else '')+(' Max' if family[4] else '')
  model=re.search(r'\bA\d{4}\b',raw);part=model[0] if model else None
  region=re.search(r'\b([A-Z0-9]{2})/A\b',raw)
  if region:spec['Región / versión']=region[0]
  if 'SIM FISICO' in raw:spec['SIM']='SIM física + eSIM'
  elif 'ESIM' in raw:spec['SIM']='Sólo eSIM'
  elif part=='A3081' or part=='A2651':spec['SIM']='Sólo eSIM'
  else:spec['SIM']='A confirmar para esta versión'
  if family=='iPhone 13 Pro' and color_key=='gray':color,color_key='Grafito','graphite'
  if family=='iPhone 15 Pro' and color_key=='black':color,color_key='Titanio negro','blacktitanium'
  if family=='iPhone 17' and color_key=='blue':color,color_key='Azul neblina','mistblue'
  if 'CPO' in raw:notes.append('Equipo CPO/reacondicionado. Confirmá estado estético, salud de batería, accesorios y garantía de la unidad antes de comprar. La imagen corresponde al modelo y color; no muestra el estado de una unidad concreta.')
  elif condition=='Activado':notes.append('Equipo activado: no se ofrece como sellado sin activar. Consultá fecha de activación, estado de batería y garantía disponible antes de comprar.')
  if 'CH/A' in raw and 'ESIM' in raw:notes.append('La versión y compatibilidad SIM indicadas requieren confirmación antes de publicar.');r['identity_pending']='Confirmar eSIM de la versión CH/A.'
  if spec['SIM'].startswith('A confirmar'):r['identity_pending']='Confirmar SIM y versión del equipo CPO.'
 elif 'IMAC' in raw:
  kind='computadoras-escritorio';family='iMac '+('Intel 21,5″' if 'MHK33' in raw else 'M4 24″');spec['Pantalla']='21,5 pulgadas' if 'MHK33' in raw else '24 pulgadas'
  spec['Procesador']='Intel Core i5' if 'MHK33' in raw else 'Apple M4'
  spec['Memoria RAM']=memory[1]+' GB';capacity=memory[2]+' '+memory[3]
  if 'CORE 10' in raw:spec['CPU']='10 núcleos'
 elif 'MAC MINI' in raw:kind='computadoras-escritorio';family='Mac mini M4';spec['Procesador']='Apple M4';notes.append('Computadora de escritorio compacta. Monitor, teclado y mouse se adquieren por separado.')
 elif 'MACBOOK' in raw:
  kind='notebooks'
  chip='A18 Pro' if 'NEO' in raw else 'M5 Max' if 'M5 MAX' in raw or part=='MGE74LL/A' else 'M5 Pro' if 'M5 PRO' in raw else 'M5'
  family='MacBook Neo' if 'NEO' in raw else 'MacBook Air M5' if ' AIR ' in raw else 'MacBook Pro '+chip
  spec['Procesador']='Apple '+chip
  screen=re.search(r'(\d{2}(?:\.\d)?)\s*[\'\"]',raw)
  size=screen[1] if screen else '16.2' if part in ['MGED4LL/A','MGE74LL/A'] else '14.2'
  if size=='14':size='14.2'
  spec['Pantalla']=size.replace('.',',')+' pulgadas'
  spec['Teclado']='Inglés (EE.UU.)' if part and 'LL/A' in part else 'Inglés (Reino Unido)' if part and 'B/A' in part else 'A confirmar'
 elif 'IPAD' in raw:
  kind='tablets';chip='M5' if 'PRO' in raw else 'M4' if 'AIR' in raw else 'A16'
  family='iPad Pro 11″ M5' if 'PRO' in raw else 'iPad Air 11″ M4' if 'AIR' in raw else 'iPad A16 (11.ª generación)'
  spec['Procesador']='Apple '+chip;spec['Conectividad']='Wi-Fi';spec['Pantalla']='11 pulgadas'
  if part=='MDWK4LL/A':capacity='256 GB';color,color_key='Negro espacial','spaceblack'
 elif 'TABLET' in raw:
  kind='tablets';family='Galaxy Tab S10 Lite' if 'S10 LITE' in raw else 'Galaxy Tab A11+' if 'A11+' in raw else 'Galaxy Tab A11'
  part=re.search(r'(?:SM-)?X\d{3}[A-Z]?',raw)[0];part=part if part.startswith('SM-') else 'SM-'+part
  spec['Conectividad']='Wi-Fi + 5G' if '5G' in raw else 'Wi-Fi + 4G LTE' if '4G' in raw else 'Wi-Fi'
  spec['Pantalla']='10,9 pulgadas' if 'S10' in raw else '11 pulgadas' if 'A11+' in raw else '8,7 pulgadas'
  if '+ PEN' in raw:spec['Accesorio incluido']='S Pen'
 else:
  family='Galaxy '+re.search(r'SAMSUNG (A\d+|S\d+\+)',raw)[1]
  part=re.search(r'(?:SM-)?(?:A\d{3}[A-Z]|S\d{3}[A-Z])(?:/DS)?',raw)[0];part=part if part.startswith('SM-') else 'SM-'+part
  spec['Conectividad']='5G' if '5G' in raw else '4G LTE'
  if 'DS' in raw:spec['SIM']='Dual SIM'
  if 'CARREGADOR' in raw:spec['Accesorio incluido']='Cargador (potencia y marca a confirmar)'
  if '+ CAPA' in raw:spec['Accesorio incluido']='Funda'
 spec.update({'Familia':family,'Color':color,'Almacenamiento':capacity,'Condición':condition})
 if part:spec['Modelo / referencia']=part
 title=(brand+' ' if not family.startswith('iPhone') else 'Apple ')+family
 if kind=='notebooks':title+=' '+spec['Pantalla'].replace(' pulgadas','″')
 title+=' · '+(spec['Memoria RAM']+' / ' if spec.get('Memoria RAM') else '')+capacity+' · '+color
 if condition!='Nuevo':title+=' · '+('CPO' if 'CPO' in condition else 'Activado')
 if kind=='smartphones' and brand=='Apple':title+=' · '+spec['SIM'] if not spec['SIM'].startswith('A confirmar') else ''
 if spec.get('Accesorio incluido'):title+=' + '+('cargador' if 'Cargador' in spec['Accesorio incluido'] else spec['Accesorio incluido'].lower())
 # Include exact hardware/regional reference to distinguish same-color variants.
 if part:title+=' · '+part
 if spec.get('Región / versión'):title+=' '+spec['Región / versión']
 specs_sentence=' '.join([f'{k}: {v}.' for k,v in spec.items() if k not in ['Familia','Condición','Color','Modelo / referencia','Región / versión']])
 description=f'{brand} {family} en color {color.lower()}. {specs_sentence} '+(' '.join(notes))
 if condition=='Nuevo':description+=' Consultá disponibilidad, contenido de la caja y condiciones de garantía antes de comprar.'
 r.update(brand=brand,kind=kind,family=family,part=part,color_key=color_key,title=title,description=description.strip(),specifications=spec,id=str(uuid.uuid5(uuid.NAMESPACE_URL,'mya-atacado-usa-20261008-'+r['sku'])),slug=slug(title)+'-'+r['sku'])
 candidates=[m for m in market if part and m.get('sku')==part and m.get('price') and 'En stock' in m.get('main','')]
 # Product SKU is the strongest hardware and keyboard identity for Apple computers/tablets.
 r['reference']=min(candidates,key=lambda m:m['price']) if candidates and not family.startswith('iPhone') else None
 if candidates:r['image_candidates']=candidates[0]['images'][:4]
 else:r['image_candidates']=[]
 if family.startswith('iPhone') and condition=='Nuevo' and spec['SIM']=='Sólo eSIM' and not r.get('identity_pending'):
  names={'blue':'mist blue','mistblue':'mist blue','cosmicorange':'cosmic orange','deepblue':'deep blue','softpink':'soft pink','spaceblack':'space black'}
  color_en=names.get(color_key,color_key)
  matches=[m for m in market if m['title'].lower().startswith(family.lower()+' ') and capacity.replace(' ','').lower() in m['title'].replace(' ','').lower() and color_en in m['title'].lower() and 'En stock' in m.get('main','')]
  if matches:r['reference']=min(matches,key=lambda m:m['price']);r['image_candidates']=matches[0]['images'][:4]
(OUT/'normalized.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'rows':len(rows),'references':sum(bool(r['reference']) for r in rows),'images':sum(bool(r['image_candidates']) for r in rows),'unmatched':[(r['sku'],r['family'],r['part']) for r in rows if not r['reference']]},ensure_ascii=False))

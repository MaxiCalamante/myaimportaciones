"""Reviewable market pricing proposal. No production writes; evidence strict by variant."""
import json,re,sys,ast,collections
from pathlib import Path
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/pricing-review-2026-10-02'
# Reuse only the prior normalizer definitions, never execute the old audit.
src=(ROOT/'scripts/match-kbeauty-market.py').read_text(encoding='utf8').split('products=json.loads')[0]
ns={'__file__':str(ROOT/'scripts/match-kbeauty-market.py')};exec(src,ns)
words,norm,sizes=ns['words'],ns['norm'],ns['sizes']
data=json.loads((OUT/'catalog-before.json').read_text(encoding='utf8'))
costs={c['product_id']:c for c in data['costs']}
candidates=[]
for f in sorted(OUT.glob('market-*.txt')):
 text=re.sub(r'^L\d+: ?', '',f.read_text(encoding='utf8'),flags=re.M)
 for block in text.split('--------------------------------------------------------------------------------'):
  head=re.match(r'\s*(.*?) \((https://[^\n]+)\)\n',block)
  if not head:continue
  title,url=head.groups()
  if not re.search(r'https://(?:www|articulo).mercadolibre.com.ar/',url) or not re.search(r'/(?:up/|p/|MLA-)',url):continue
  primary=re.search(r'^# (.+)$',block,re.M)
  if not primary:continue
  title=primary[1];after=block[primary.end():]
  match=re.search(r'^\$\s*([\d.,]+)(?:[^\n]*)$',after,re.M)
  if not match:continue
  amount=float(match[1].replace('.','').replace(',','.'))
  if amount<=0:continue
  attrs=' '.join(re.findall(r'^.*(?:Volumen de la unidad|Peso neto|Peso de la unidad|Unidades por pack|Cantidad de productos|Nombre de la mascarilla|Nombre del producto|Nombre|Línea|Marca|Modelo).*$|^\s*\* (?:Volumen de la unidad|Peso de la unidad).*$',block,re.M))
  packs=re.findall(r'(?:Cantidad de productos|Unidades por pack)\s*(?:\||:)?\s*(\d+)',block)
  intl=bool(re.search(r'international_context=true|compra internacional|env[ií]o desde|Impuestos:\s*\$|despachamos desde Estados Unidos',block,re.I))
  if re.search(r'\b(?:Para Crema|ZZ|refill|pouch|recarga|repuesto)\b',title,re.I):continue
  candidates.append(dict(title=title,url=url.split('?')[0],price=amount,attributes=attrs,pack=int(packs[0]) if packs else None,international=intl,source=f.name,words=sorted(words(title+' '+attrs)),sizes=sorted(sizes(title+' '+attrs))))
# One URL can have different indexed prices. Keep this uncertainty explicit.
prices=collections.defaultdict(set)
def listing_id(url):
 m=re.search(r'(?:MLAU|MLA-?)\d+',url)
 return m[0].replace('-','') if m else url
for c in candidates:prices[listing_id(c['url'])].add(c['price'])
unique={ (c['url'],c['price']):c for c in candidates }
candidates=list(unique.values())
results=[]
for p in data['products']:
 want=words(p['title']);expected=sizes(p['title']);cs=[]
 old=costs[p['id']]
 for c in candidates:
  have=set(c['words']);observed={tuple(x) for x in c['sizes']}
  # Primary title must identify the brand. Brand data inconsistent with the title needs review.
  if not set(words(p['brand']))<=set(words(c['title'])):continue
  if c['international']:continue
  model=p.get('model') or ''
  if p['brand'] in ['Total','Wadfow']:
   codes=re.findall(r'\b[A-Z]{2,}\d[A-Z0-9]*\b',p['title'])
   if not codes or not all(code.lower() in norm(c['title']+' '+c['attributes']) for code in codes):continue
   coverage=1.;same_size=True
  else:
   coverage=len(want&have)/len(want) if want else 0
   if coverage<.80:continue
   same_size=expected<=observed
   if not same_size:continue
   # Sensitive formula/version/color/count tokens cannot be omitted or substituted.
   sensitive={'pdrn','txa','nmn','noni','retinol','retinal','azelaic','cica','kojic','turmeric','exosome','tea','trica','mild','plus','pro','pink','black','red','peptide','gluta','succinic','hyaluronic','niacinamide','x2','white','ivory','light','poremizing','probio','fresh','ultra','peptide','collagen','capsule','mist','oil','foam','toner','mask','cream','serum'}
   title_have=words(c['title'])
   variants={'x2','white','ivory','pink','black','mini','mild','poremizing','probio','tea','trica','ultra','retinol','retinal','txa','azelaic','kojic','turmeric','exosome','nmn'}
   if (title_have&variants)!=(want&variants):continue
   if {'hyalu','cica'}<=want and not {'hyalu','cica'}<=title_have:continue
   types={'oil','foam','toner','mask','cream','serum','pad','kit','ampoule'}
   if (title_have&types)-want:continue
   if not (want&sensitive)<=have:continue
   nums=set(re.findall(r'\b(?:7500|2000|25000|345|147|16|20|70|30|4\.0|2\.0)\b',p['title'].lower()))
   if any(not re.search(r'\b'+re.escape(n)+r'\b',(c['title']+' '+c['attributes']).lower()) for n in nums):continue
   count=re.search(r'(\d+)\s*(?:mascarillas|pads|toallitas|productos|unidades)',p['title'],re.I)
   if count and not re.search(r'\b'+count[1]+r'\b',c['title']+' '+c['attributes']):continue
   if re.search(r'pack|mascarillas de',p['title'],re.I):
    pack=re.search(r'(\d+)\s*(?:mascarillas|x)',p['title'],re.I)
    if pack and c['pack']!=int(pack[1]) and not re.search(r'\b'+pack[1]+r'\s*(?:mascarillas|x)',c['title'],re.I):continue
   elif c['pack'] and c['pack']>1:continue
   if not re.search(r'kit|pack|productos|mascarillas de',p['title'],re.I) and re.search(r'\bkit\b|\bpack\s*(?:de)?\s*[2-9]|\b[2-9]\s*(?:piezas|unidades)',c['title'],re.I):continue
  cs.append({**c,'coverage':round(coverage,3),'same_size':same_size,'conflicting_indexed_prices':len(prices[listing_id(c['url'])])>1})
 cs.sort(key=lambda c:c['price'])
 results.append(dict(id=p['id'],sku=p['sku'],title=p['title'],active=p['is_active'],current=p['retail_price'],candidates=cs,previous_ml_url=old['ml_url'],previous_ml_price=old['ml_price']))
(OUT/'market-candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
for i,r in enumerate(results):
 c=r['candidates'][0] if r['candidates'] else None
 print(i,r['sku'],r['title'],'|',f"{c['price']} | {c['title']} | pack={c['pack']} | conflict={c['conflicting_indexed_prices']}" if c else 'NO COMPARABLE')
print('Matched',sum(bool(r['candidates']) for r in results),'/',len(results))

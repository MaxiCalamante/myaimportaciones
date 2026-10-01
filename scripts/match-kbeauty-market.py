"""Prepare ML candidates for manual review; never writes database prices."""
import json,re,unicodedata
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/supplier-import-2026-10-01'
SYN={'crema':'cream','cremas':'cream','jalea':'jelly','gelatina':'jelly','colageno':'collagen','mascarilla':'mask','mascarillas':'mask','mascara':'mask','contorno':'eye','ojos':'eye','ojeras':'eye','nocturna':'night','nocturno':'night','noches':'night','envolvente':'wrapping','envoltura':'wrapping','envolver':'wrapping','tonico':'toner','espuma':'foam','limpiador':'cleanser','limpiadora':'cleanser','limpieza':'cleansing','ampolla':'ampoule','ampollas':'ampoule','acido':'acid','hialuronico':'hyaluronic','hidratante':'moisturizing','peptidos':'peptide','retinol':'retinol','rosa':'pink','negro':'black','preto':'black','rosado':'pink','rosada':'pink','glutathione':'gluta','glutation':'gluta','glutathion':'gluta','glutathiona':'gluta','turmeric':'turmeric','curcuma':'turmeric','kojico':'kojic','unic':'unit','unid':'unit','unidad':'unit','unidades':'unit','pc':'unit','pcs':'unit','sheet':'mask','discos':'pad','almohadillas':'pad','pads':'pad','moisture':'moisturizing','hydratante':'moisturizing','hidratacion':'moisturizing','acondicionador':'conditioner','protector':'sun','solar':'sun','proteccion':'sun','spray':'spray','bruma':'mist','niebla':'mist','aceite':'oil','aceites':'oil','glow':'glow','suero':'serum','exosomas':'exosome','exosoma':'exosome'}
STOP=set('de del para con la el y a en x facial faciales rostro facialmente tratamiento coreano coreana todo tipo piel sensible dia noche momento aplicacion indicado indicado pack gr g ml ml130 gramo gramos mililitros contenido diario korea korean madagascar centella skincare cente creme produto productos produto edad'.split())
def norm(s):
    s=unicodedata.normalize('NFD',s.lower());s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    s=s.replace('skin 1004','skin1004').replace('16bb','16 bb').replace('hyalu cica','hyalu-cica').replace('capsulas','capsule').replace('capsula','capsule').replace('vitamina','vita').replace('vitamin','vita').replace('vit c','vita c').replace('ceramidas','ceramide').replace('hipocloroso','hypochlorous').replace('wrapping','wrapping').replace('4.0','').replace('2.0','')
    s=re.sub(r'(\d)\s*(ml|g|gr)\b',r'\1 \2',s)
    return s
def words(s):
    s=norm(s);w=re.findall(r'[a-z]+\d*|\d+(?:[.,]\d+)?',s)
    return {SYN.get(t,t) for t in w if t not in STOP and not t.isdigit()}
def sizes(s):return {(float(n.replace(',','.')), 'g' if u=='gr' else u) for n,u in re.findall(r'(\d+(?:[.,]\d+)?)\s*(ml|gr|g)\b',norm(s))}
def price(s):return float(s.replace('.','').replace(',','.'))

products=json.loads((OUT/'comparison.json').read_text(encoding='utf-8'))
results=[]
for p in products:
    text=(OUT/f"ml-search-{p['key']}.txt").read_text(encoding='utf-8')
    if (OUT/f"ml-open-{p['key']}.txt").exists():text+='\n--------------------------------------------------------------------------------\n'+(OUT/f"ml-open-{p['key']}.txt").read_text(encoding='utf-8')
    text=re.sub(r'^L\d+: ?', '',text,flags=re.M)
    candidates=[]
    for block in text.split('--------------------------------------------------------------------------------'):
        head=re.match(r'\s*(.*?) \((https://[^\n]+)\)\n',block)
        if not head:continue
        title,url=head.groups()
        if not re.search(r'^https://www.mercadolibre.com.ar/',url) or not re.search(r'/(up/|p/|MLA-)',url):continue
        primary=re.search(r'^# (.+)$',block,re.M)
        primary_name=primary[1] if primary else title
        text_after=block[primary.end():] if primary else ''
        price_match=re.search(r'^\$\s*([\d.,]+)(?:[^\n]*)$',text_after,re.M)
        if not price_match: continue
        before=text_after[:price_match.start()]
        price_segment=text_after[price_match.end():]
        # The displayed main price is the comparison; never use installments, net tax, coupons or other offers.
        purchase_part=price_segment.split('## Otras opciones')[0].split('## Opiniones')[0]
        international='international_context=true' in url or bool(re.search(r'env[ií]o desde|compra internacional|Impuestos:\s*\$|productos de Internacional|entrega internacional|despachamos desde Estados Unidos',block,re.I))
        amount=price(price_match[1])
        identity=primary_name+' '+ ' '.join(re.findall(r'^(?:Marca|Nombre|L[ií]nea|Nombre de la mascarilla facial)\s*\|\s*(.*)$',block,re.M))
        want=words(p['title']);have=words(identity)
        missing=sorted(want-have)
        cover=len(want&have)/len(want) if want else 0
        expected=sizes(p['title']);observed=sizes(identity+' '+' '.join(re.findall(r'^.*(?:Volumen de la unidad|Peso neto|Peso de la unidad).*$|^\s*\* (?:Volumen de la unidad|Peso de la unidad).*$',block,re.M)))
        same_size=expected<=observed if expected else True
        count_match=re.search(r'(?:Cantidad de productos|Unidades por pack)\s*(?:\||:)\s*(\d+)',block)
        candidates.append(dict(title=primary_name,url=url,price=amount,coverage=round(cover,3),missing=missing,
            size_match=same_size,expected_sizes=sorted(expected),observed_sizes=sorted(observed),
            pack=int(count_match[1]) if count_match else None,international=international,
            source_file=f"ml-search-{p['key']}.txt",raw_excerpt=primary_name+' | '+price_match[0]))
    candidates.sort(key=lambda c:(c['international'],not c['size_match'],-c['coverage'],c['price']))
    valid=[c for c in candidates if c['coverage']>=.8 and c['size_match'] and not c['international'] and 'medicube' not in c['missing'] and 'skin1004' not in c['missing']]
    results.append({'key':p['key'],'title':p['title'],'candidates':candidates,'suggested':min(valid,key=lambda c:c['price']) if valid else None})
(OUT/'market-candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
for r in results:
    c=r['suggested'] or (r['candidates'][0] if r['candidates'] else None)
    print(f"{r['key']} | {r['title']} | "+(f"{c['price']} | cov={c['coverage']} size={c['size_match']} international={c['international']} pack={c['pack']} missing={','.join(c['missing'])} | {c['title']}" if c else 'NO PRICE'))

look=[]
for r in results:
    if r['suggested']:continue
    text=(OUT/f"ml-search-{r['key']}.txt").read_text(encoding='utf-8')
    sources=[]
    for title,url in re.findall(r'^(.+?) \((https://(?:www|articulo).mercadolibre.com.ar/[^\n]+)\)\n',text,re.M):
        sources.append({'url':url,'score':len(words(r['title'])&words(title))/len(words(r['title']))})
    sources.sort(key=lambda c:-c['score'])
    look.append({'key':r['key'],'urls':[c['url'] for c in sources[:3]]})
(OUT/'open-queries.json').write_text(json.dumps(look),encoding='utf-8')

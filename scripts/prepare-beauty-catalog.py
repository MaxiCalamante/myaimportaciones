import json,pathlib,re,html,importlib.util
root=pathlib.Path(__file__).resolve().parents[1];folder=root/'docs/catalog-audit'
spec=importlib.util.spec_from_file_location('taxonomy',root/'scripts/catalog-taxonomy.py');tax=importlib.util.module_from_spec(spec);spec.loader.exec_module(tax)
products=json.loads((folder/'products-before.json').read_text(encoding='utf-8'))
raw={p['imageUrl']:p for p in json.loads((root.parent/'scratch/atacado_cosmetics.json').read_text(encoding='utf-8'))}
images=json.loads((folder/'beauty-resolved.json').read_text(encoding='utf-8'))
# Same labelled 500 ml conditioner; discard the supplier's misleading two-bottle photograph.
a=next(p for p in images if p['id'].startswith('79034f3e'));b=next(p for p in images if p['id'].startswith('dfc1b277'))
for key in ['image_url','source','original_image','width','height']:a[key]=b[key]
(folder/'beauty-resolved.json').write_text(json.dumps(images,ensure_ascii=False,indent=2),encoding='utf-8')
byimage={p['id']:p for p in images};cats={c['id']:c['slug'] for c in json.loads((folder/'categories-before.json').read_text(encoding='utf-8'))}
names={**tax.NAMES,**tax.NEW}
overrides={'4351682b':'SKIN1004 Poremizing Quick Clay Stick Mask 27g','505be2f3':'Dr. Althea 345 Relief Cream 50ml','5e56d8fa':'Lilyeve Grow:Turn Exosome Brush Ampoule 100ml','8ae472d2':'Numbuzin No.9 NAD+ Retinol Volumetox Eye Cream 10ml','5700e91f':'Medicube Kojic Acid Turmeric Vita Capsule Foam Cleanser 120g','965a7d37':'Medicube PDRN Pink Hyaluronic Moisturizing Cream 50ml','767c239d':'VT Cosmetics Reedle Shot 300 50ml'}
overrides.update({'874cb20a':'Medicube Deep Vita C Ampoule 14.5% - Pack x3','e3739a31':'Medicube Red Succinic Acid Peeling Pad 155g - 70 discos','52143c62':'Karseell Maca Essence Repair Set - Mascarilla 500ml + Aceite 50ml'})
brands=['SKIN1004','Dr. Althea','Celimax','Medicube','Anua','Karseell',"Victoria's Secret",'Dear Body','Numbuzin','Lilyeve','VT Cosmetics']
updates=[]
for p in products:
    if '/tools/' in p['image_url'] or 'unsplash' in p['image_url']:continue
    t=html.unescape(overrides.get(p['id'][:8],p['title']))
    t=re.sub(r'\s*\([^)]*\)?/?','',t);t=re.sub(r'\s+\d{4,}\s*$','',t)
    t=re.sub(r"(?i)VICTORIA'S SECRET LOCAO VICTORIA'S SECRET", "Victoria's Secret Loción",t)
    t=re.sub(r'(?i)KARSEELL (KIT|MASCARA CAPILAR) KARSEELL',r'Karseell \1',t)
    t=t.replace('DR.ALTHEA','Dr. Althea').replace('Dr Althea','Dr. Althea').replace('SRPAY','SPRAY')
    for pt,es in [('CREME FACIAL','Crema facial'),('MASCARA FACIAL','Mascarilla facial'),('MASCARA CAPILAR','Mascarilla capilar'),('TONICO FACIAL','Tónico facial'),('OLEO FACIAL','Aceite facial'),('SERUM FACIAL','Sérum facial'),('CREME PARA CONTORNO DE OLHOS','Crema para contorno de ojos')]:t=t.replace(pt,es)
    brand=next((b for b in brands if b.upper() in t.upper()),None)
    assert brand,(p['id'],t)
    t=t.title()
    for acronym in ['PDRN','BHA','AHA','NMN','TXA','NAD','BNC']:t=re.sub(r'\b'+acronym+r'\b',acronym,t,flags=re.I)
    t=t.replace('Madag. Cent.', 'Madagascar Centella').replace('Madag Cent', 'Madagascar Centella').replace('Madag. Centella','Madagascar Centella').replace('Brigheting','Brightening').replace('Enssence','Essence').replace('Creme Age-R','Crema Age-R')
    for repeated in ['Celimax','Numbuzin']:t=re.sub(r'(?i)('+repeated+r'.*?)\s'+repeated+r'\s',r'\1 ',t)
    t=re.sub(re.escape(brand),brand,t,flags=re.I)
    t=re.sub(r'(\d)\s*(ML|ml|G|g|GR)\b',lambda m:m[1]+' '+('ml' if m[2].lower()=='ml' else 'g'),t,flags=re.I)
    category=tax.classify(t,cats[p['category_id']]);presentation=re.findall(r'\b\d+(?:[.,]\d+)?\s*(?:ml|g)\b',t,re.I)
    specs={**p.get('specifications',{}),'Marca':brand,'Tipo':names.get(category,category)}
    if presentation:specs['Presentación']=' + '.join(presentation)
    source=raw.get(p['image_url']);image=byimage.get(p['id']);sku=source['sku'] if source else None
    if sku:specs['Código del proveedor']=sku
    description=f"{t}. {names.get(category,'Producto de cuidado personal')} de {brand}."
    if presentation:description+=' Presentación: '+' + '.join(presentation)+'.'
    updates.append({'id':p['id'],'title':t,'brand':brand,'sku':sku,'description':description,'image_url':image['image_url'] if image else p['image_url'],'source_url':source['prodUrl'] if source else None,'specifications':specs,'category_slug':category})
def quote(s):return "'"+s.replace("'","''")+"'"
query=f"""with source as (select * from jsonb_to_recordset({quote(json.dumps(updates,ensure_ascii=False))}::jsonb) as x(id uuid,title text,brand text,sku text,description text,image_url text,source_url text,specifications jsonb,category_slug text)), changed as (
update public.products p set title=s.title,brand=s.brand,sku=s.sku,description=s.description,image_url=s.image_url,image_urls=array[s.image_url],source_url=s.source_url,specifications=s.specifications,category_id=c.id
from source s join public.categories c on c.slug=s.category_slug where p.id=s.id returning p.id) select count(*) as updated from changed;"""
(folder/'beauty-refresh.sql').write_text(query,encoding='utf-8')
(folder/'beauty-updates.json').write_text(json.dumps(updates,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(updates),'cosmetics')

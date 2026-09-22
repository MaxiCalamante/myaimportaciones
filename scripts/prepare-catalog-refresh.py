"""Build catalog changes from exact supplier SKUs, retaining reviewable local evidence."""
import json, pathlib, re, collections
from importlib.machinery import SourceFileLoader
root=pathlib.Path(__file__).resolve().parents[1]; folder=root/'docs/catalog-audit'
taxonomy=SourceFileLoader('taxonomy',str(root/'scripts/catalog-taxonomy.py')).load_module()
products=json.loads((folder/'products-before.json').read_text(encoding='utf-8'))
cats=json.loads((folder/'categories-before.json').read_text(encoding='utf-8'))
details={str(d['sku']):d for d in map(json.loads,(folder/'supplier-details.jsonl').read_text(encoding='utf-8').splitlines())}
bycat={c['id']:c['slug'] for c in cats}
def quote(s):return "'"+str(s).replace("'","''")+"'"
names={**taxonomy.NAMES,'sierras-corte':'Sierras eléctricas','niveles-laser-medicion':'Niveles y medición','agro-jardineria':'Jardinería','hidrolavadoras-alta-presion':'Hidrolavadoras','generadores-energia':'Generadores','gatos-hidraulicos-criques':'Gatos y criques','soldadoras-inverter':'Soldadoras'}
sql=[]
for slug,name in names.items():sql.append(f'update public.categories set name={quote(name)} where slug={quote(slug)};')
for slug,name in taxonomy.NEW.items():
    parent='cosmetica-coreana' if slug=='contorno-ojos' else 'cuidado-capilar' if slug=='kits-capilares' else 'herramientas-equipamiento'
    sql.append(f"insert into public.categories(name,slug,parent_id,display_order) select {quote(name)},{quote(slug)},id,10 from public.categories where slug={quote(parent)} on conflict(slug) do nothing;")
(folder/'category-refresh.sql').write_text('\n'.join(sql),encoding='utf-8')
updates=[]
for p in products:
    match=re.fullmatch(r'/products/tools/(\d+)\.jpg',p['image_url'] or '')
    if not match:continue
    sku=match.group(1);d=details[sku]
    assert d['images'] and d['description_lines'] and d['width']>=300
    original=p['title'];brand='Wadfow' if original.startswith('WADFOW') else 'Total Tools'
    model=re.findall(r'\b[A-Z]{2,}[A-Z0-9]*\d[A-Z0-9-]*\b',original)
    title=' '.join(w if re.search(r'\d',w) else w.lower() for w in original.split())
    title=title.replace('wadfow', 'Wadfow',1) if brand=='Wadfow' else title.replace('total', 'Total',1)
    specs={**(p.get('specifications') or {}),'Marca':brand,'Código del proveedor':sku}
    if len(model)==1:specs['Modelo']=model[0]
    updates.append({'id':p['id'],'old_image':p['image_url'],'title':title,'brand':brand,'model':model[0] if len(model)==1 else None,'sku':sku,'description':'\n'.join(d['description_lines']), 'image_url':d['images'][0], 'image_urls':d['images'], 'source_url':d['url'],'specifications':specs,'category_slug':taxonomy.classify(original,bycat[p['category_id']])})
valid_slugs=set(bycat.values())|set(taxonomy.NEW)
assert all(p['category_slug'] in valid_slugs for p in updates)
(folder/'tool-updates.json').write_text(json.dumps(updates,ensure_ascii=False,indent=2),encoding='utf-8')
for offset in range(0,len(updates),100):
    data=json.dumps(updates[offset:offset+100],ensure_ascii=False)
    query=f"""with source as (select * from jsonb_to_recordset({quote(data)}::jsonb) as x(id uuid,old_image text,title text,brand text,model text,sku text,description text,image_url text,image_urls text[],source_url text,specifications jsonb,category_slug text)), changed as (
update public.products p set title=s.title,brand=s.brand,model=s.model,sku=s.sku,description=s.description,image_url=s.image_url,image_urls=s.image_urls,source_url=s.source_url,specifications=s.specifications,category_id=c.id
from source s join public.categories c on c.slug=s.category_slug where p.id=s.id and (p.image_url=s.old_image or p.sku=s.sku) returning p.id) select count(*) as updated from changed;"""
    (folder/f'tool-refresh-{offset//100}.sql').write_text(query,encoding='utf-8')
print(json.dumps(collections.Counter(p['category_slug'] for p in updates),ensure_ascii=False))
print('Prepared',len(updates),'products')

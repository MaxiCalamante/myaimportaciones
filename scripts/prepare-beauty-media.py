"""Resolve exact presentations; download originals without artificial upscaling."""
import json,pathlib,re,requests,io,concurrent.futures as cf,shutil
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]; folder=root/'docs/catalog-audit'
products=json.loads((folder/'products-before.json').read_text(encoding='utf-8'))
manual=json.loads((folder/'beauty-manual-map.json').read_text(encoding='utf-8'))
candidates={p['id']:p for p in map(json.loads,(folder/'beauty-candidates.jsonl').read_text(encoding='utf-8').splitlines())}
local={p['title']:p['image_url'] for p in products if p['image_url'].startswith('/products/') and '/tools/' not in p['image_url']}
duplicates={'4351682b':'SKIN1004 Poremizing Quick Clay Stick Mask 27g','4b69f946':'Medicube One Day Exosome Shot 7500 30ml','ddb84764':'Medicube One Day Exosome Shot 2000 30ml','b75501b9':'Celimax Retinal Shot Tightening Booster 15ml','b07184ef':'Celimax Retinol Shot Tightening Serum 30ml','d26e2e05':'Medicube PDRN Pink Collagen Capsule Cream 55g','d479bc30':'Karseell Collagen Hair Mask 500ml','fb5a74f7':'Medicube Collagen Jelly Cream 50ml'}
manual['52143c62']=['karseell.eu','pack-reparacion-capilar-mascarilla-colageno-500ml-serum-aceite-de-argan-50ml','']
outdir=root/'public/products/catalog';outdir.mkdir(exist_ok=True)
existing_path=folder/'beauty-resolved.json'
existing={p['id']:p for p in json.loads(existing_path.read_text(encoding='utf-8')) if 'image_url' in p} if existing_path.exists() else {}
results=[]
def resolve(p):
    if p['id'] in existing and (root/'public'/existing[p['id']]['image_url'].lstrip('/')).exists():return existing[p['id']]
    prefix=p['id'][:8];r={'id':p['id'],'title':p['title']}
    if prefix in duplicates:return {**r,'image_url':local[duplicates[prefix]],'source':'Local exact presentation'}
    if prefix=='ff33bec9':
        name='medicube-collagen-jelly-110.webp';shutil.copyfile(root.parent/'Cosmeticos/medicube collgen jelly 110.webp',outdir/name)
        return {**r,'image_url':'/products/catalog/'+name,'source':'Local exact presentation'}
    source=None;url=None
    if prefix in manual:
        site,handle,variant=manual[prefix];data=json.loads((folder/(site+'.json')).read_text(encoding='utf-8'))
        matches=[x for x in data if x['handle']==handle]
        if not matches:return {**r,'error':'Official handle not found'}
        item=matches[0];selected=next((v for v in item['variants'] if v['title']==variant),None)
        if variant and not selected:return {**r,'error':'Exact variant not found: '+variant}
        image_id=(selected or {}).get('featured_image',{});image_id=image_id.get('id') if isinstance(image_id,dict) else None
        image=next((im for im in item['images'] if im['id']==image_id),item['images'][0]);url=image['src'];source='https://'+site+'/products/'+handle
    else:
        accepted=[c for c in candidates.get(p['id'],{}).get('candidates',[]) if max(c['width'],c['height'])>=350 and (c['supplier_exact'] or c['score']>=.92 or prefix in ['8ae472d2','874cb20a']) and not any(w in c['title'].lower() and w not in p['title'].lower() for w in ['shimmer','prime','negro','starlit'])]
        if accepted:
            c=max(accepted,key=lambda x:(x['supplier_exact'],x['score']));url=c['image'];source=c['url']
    if not url:return {**r,'error':'Exact photo unresolved'}
    response=requests.get(url,timeout=40);response.raise_for_status();im=Image.open(io.BytesIO(response.content));im.verify()
    im=Image.open(io.BytesIO(response.content));ext={'JPEG':'jpg','PNG':'png','WEBP':'webp'}.get(im.format)
    if not ext or max(im.size)<350:return {**r,'error':'Insufficient source image'}
    name=p['id']+'.'+ext;(outdir/name).write_bytes(response.content)
    return {**r,'image_url':'/products/catalog/'+name,'source':source,'original_image':url,'width':im.width,'height':im.height}
targets=[p for p in products if 'atacadousa' in p['image_url']]
with cf.ThreadPoolExecutor(max_workers=4) as pool:
    futures={pool.submit(resolve,p):p for p in targets}
    for future in cf.as_completed(futures):
        try:results.append(future.result())
        except Exception as e:results.append({'id':futures[future]['id'],'title':futures[future]['title'],'error':str(e)})
(folder/'beauty-resolved.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print('Resolved',sum('image_url' in p for p in results),'/',len(results))
for p in results:
    if 'error' in p:print(p['id'][:8],p['title'],p['error'])

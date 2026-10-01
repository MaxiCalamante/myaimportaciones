"""Use an equivalent supplier's clean photo when the selected cover has a watermark."""
import json,io,requests
from pathlib import Path
from PIL import Image
out=Path(__file__).resolve().parents[1]/'docs/cosmetics-completion-2026-10-01'
rows=json.loads((out.parent/'supplier-import-2026-10-01/comparison.json').read_text(encoding='utf8'))
fixes=[];sheet=Image.new('RGB',(900,300),'white')
for n,k in enumerate([7,54,55]):
 p=next(x for x in rows if x['key']==k);o=next(x for x in p['offers'] if x['supplier']=='star')
 r=requests.get(o['image_url'],timeout=40);r.raise_for_status();im=Image.open(io.BytesIO(r.content));assert min(im.size)>100 and len(r.content)<750000
 name=f'mya-cosmetics-fix-20261001-{k}.jpg';path=out/'media'/name;path.write_bytes(r.content)
 thumb=im.convert('RGB');thumb.thumbnail((280,280));sheet.paste(thumb,(n*300,0))
 fixes.append(dict(id=p['id'],key=k,title=p['title'],path=str(path.resolve()),source=o['image_url'],supplier_url=o['url'],image_url='https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/'+name))
sheet.save(out/'replacement-contact.jpg')
(out/'media-fixes.json').write_text(json.dumps(fixes,ensure_ascii=False,indent=2),encoding='utf8')
print('Replacement photos ready:',len(fixes))

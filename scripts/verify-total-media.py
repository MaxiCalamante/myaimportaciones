"""Check the real supplier galleries before loading tools; source downloads remain private."""
import json,io,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image,ImageOps,ImageDraw
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-selection-2026-10-01'
payload=json.loads((OUT/'payload.json').read_text(encoding='utf-8'))
MEDIA=OUT/'media';MEDIA.mkdir(exist_ok=True)
jobs=[(p['sku'],i,u) for p in payload['products'] for i,u in enumerate(p['image_urls'])]
def check(job):
 sku,i,url=job;path=MEDIA/f'{sku}-{i}.bin'
 if not path.exists():
  r=requests.get(url,timeout=40);r.raise_for_status();path.write_bytes(r.content)
 im=Image.open(path);im.load();assert min(im.size)>=200,(sku,im.size)
 return dict(sku=sku,image_index=i,width=im.width,height=im.height,bytes=path.stat().st_size,source=url)
with ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(check,jobs))
(OUT/'media-private.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
public=dict(products=len(payload['products']),gallery_images=len(rows),all_readable=True,minimum_width=min(r['width'] for r in rows),minimum_height=min(r['height'] for r in rows))
(OUT/'media-verification.json').write_text(json.dumps(public,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(1200,10*185),'#edf4f8');draw=ImageDraw.Draw(sheet)
for n,p in enumerate(payload['products']):
 im=Image.open(MEDIA/f'{p["sku"]}-0.bin').convert('RGB');im.thumbnail((185,140))
 x=(n%6)*200;y=(n//6)*185;sheet.paste(im,(x+(200-im.width)//2,y))
 draw.text((x+8,y+143),p['brand']+' '+p['model'],fill='#172033')
 draw.text((x+8,y+160),'Publico' if p['is_active'] else 'Borrador',fill='#075985')
sheet.save(OUT/'contact-tools.jpg',quality=90)
print(json.dumps(public))

"""Download the exact supplier cover images for MYA's existing image bucket."""
import concurrent.futures as cf,json,io
from pathlib import Path
import requests
from PIL import Image
OUT=Path(__file__).resolve().parents[1]/'docs/supplier-import-2026-10-01'
MEDIA=OUT/'media';MEDIA.mkdir(exist_ok=True)
products=json.loads((OUT/'comparison.json').read_text(encoding='utf-8'))
def download(p):
    r=requests.get(p['selected']['image_url'],timeout=40);r.raise_for_status()
    im=Image.open(io.BytesIO(r.content))
    assert min(im.size)>100,(p['title'],im.size)
    suffix={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp'}[im.format]
    data=r.content
    if len(data)>740000:
        buf=io.BytesIO();im.save(buf,format='WEBP',quality=90);data=buf.getvalue();suffix='.webp'
    assert len(data)<=750000
    filename='mya-kbeauty-20261001-'+str(p['key'])+suffix
    (MEDIA/filename).write_bytes(data)
    return {'key':p['key'],'product_id':p['id'],'filename':filename,'path':str((MEDIA/filename).resolve()),'width':im.width,'height':im.height,'bytes':len(data),'source':p['selected']['image_url'],
            'public_url':'https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/'+filename}
rows=[]
with cf.ThreadPoolExecutor(max_workers=4) as pool:
    for i,row in enumerate(pool.map(download,products),1):
        rows.append(row)
        if i%20==0:print('media',i,'/',len(products),flush=True)
(OUT/'media.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('media ready',len(rows),flush=True)

import json,re,html,unicodedata,difflib,concurrent.futures as cf,io,time
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from PIL import Image
ROOT=Path('docs/catalog-audit');BASE='https://comprasparaguay.com.ar'
raw=json.loads(Path('../scratch/atacado_cosmetics.json').read_text(encoding='utf-8'))
products=json.loads((ROOT/'products-before.json').read_text(encoding='utf-8'))
byimage={p['image_url']:p for p in products}
file=ROOT/'beauty-candidates.jsonl'
known={json.loads(s)['id'] for s in file.read_text(encoding='utf-8').splitlines()} if file.exists() else set()
def norm(s):
 s=html.unescape(s).lower();s=''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)!='Mn');return re.sub('[^a-z0-9]+',' ',s).strip()
def run(row):
 p=byimage.get(row['imageUrl'])
 if not p:return None
 q=re.sub(r'\([^)]*\)?','',html.unescape(row['title'])).strip()
 r=requests.get(BASE+'/busca/',params={'q':q},timeout=25);r.raise_for_status();s=BeautifulSoup(r.content,'html.parser')
 links={a['href']:a.get_text(' ',strip=True) for a in s.select('a[href]') if re.search(r'__\d+',a['href']) and a.get_text(strip=True)}
 candidates=sorted(links.items(),key=lambda x:difflib.SequenceMatcher(None,norm(q),norm(x[1])).ratio(),reverse=True)[:3]
 result={'id':p['id'],'original':p['title'],'supplier_url':row['prodUrl'],'query':q,'candidates':[]}
 for link,title in candidates:
  score=difflib.SequenceMatcher(None,norm(q),norm(title)).ratio()
  if score<.65:continue
  url=BASE+link;rr=requests.get(url,timeout=25);rr.raise_for_status();ss=BeautifulSoup(rr.content,'html.parser');meta=ss.select_one('meta[property="og:image"]')
  if not meta:continue
  img=meta['content'];ir=requests.get(img,timeout=20);ir.raise_for_status();im=Image.open(io.BytesIO(ir.content))
  source_id=row['productId'];exact_source=(row['prodUrl'] in html.unescape(rr.text))
  result['candidates'].append({'title':title,'url':url,'image':img,'width':im.width,'height':im.height,'score':round(score,3),'supplier_exact':exact_source})
 return result
with file.open('a',encoding='utf-8') as out,cf.ThreadPoolExecutor(max_workers=3) as pool:
 jobs={pool.submit(run,row):row for row in raw if byimage.get(row['imageUrl'],{}).get('id') not in known}
 for i,f in enumerate(cf.as_completed(jobs)):
  try:
   r=f.result()
   if r:out.write(json.dumps(r,ensure_ascii=False)+'\n');out.flush()
  except Exception as e:print('ERROR',jobs[f]['title'],str(e),flush=True)
  if i%10==0:print('Beauty',i+1,'/',len(jobs),flush=True)

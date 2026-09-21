"""Read supplier evidence only. Resumable; does not modify prices, inventory or database."""
import concurrent.futures as cf, json, re, html, time, io
from pathlib import Path
import requests
from PIL import Image
ROOT=Path('docs/catalog-audit'); ROOT.mkdir(exist_ok=True)
BASE='https://www.totalherramientasoficial.com.py'
products=json.loads((ROOT/'products-before.json').read_text(encoding='utf-8'))
needed={p['image_url'].split('/')[-1].split('.')[0]:p for p in products if '/tools/' in (p['image_url'] or '')}
def get(url):
 for attempt in range(3):
  try:
   r=requests.get(url,timeout=25);r.raise_for_status();return r
  except requests.RequestException:
   if attempt==2: raise
   time.sleep(1+attempt)
def listing(page):
 s=get(BASE+'/produtos?pagina='+str(page)).content.decode('utf-8','replace');out=[]
 for card in s.split('<div class="product">')[1:]:
  sku=re.search(r'data-item_codigo="(\d+)"',card);link=re.search(r'href="([^"]*/produto/[^"]+)"',card);img=re.search(r'<img[^>]+src="([^"]+)"',card)
  if sku and link and img: out.append({'sku':sku[1],'url':html.unescape(link[1]),'image':html.unescape(img[1])})
 return out
indexfile=ROOT/'supplier-index.json'
if indexfile.exists(): index=json.loads(indexfile.read_text(encoding='utf-8'))
else:
 index={}
 with cf.ThreadPoolExecutor(max_workers=4) as pool:
  jobs={pool.submit(listing,n):n for n in range(1,165)}
  for i,f in enumerate(cf.as_completed(jobs)):
   try:
    for row in f.result(): index[row['sku']]=row
   except Exception as e: print('LIST_ERROR',jobs[f],str(e),flush=True)
   if i%20==0: print('Listings',i+1,'/164',len(index),'SKUs',flush=True)
 indexfile.write_text(json.dumps(index,ensure_ascii=False),encoding='utf-8')
print('Exact supplier matches',len(set(index)&set(needed)),'of',len(needed),flush=True)
file=ROOT/'supplier-details.jsonl'
known={json.loads(s)['sku'] for s in file.read_text(encoding='utf-8').splitlines()} if file.exists() else set()
def detail(row):
 s=get(row['url']).content.decode('utf-8','replace')
 # Restrict images and description to this product, excluding recommendations.
 pid=re.search(r'-(\d+)\.html',row['url'])[1]
 images=list(dict.fromkeys(html.unescape(u) for u in re.findall(r'(?:src|href|data-zoom-image)="([^"]*/img/'+pid+r'/produtos/1500/[^"]+)"',s)))
 desc=s.split('id="product-tab-description">',1)[-1].split('id="product-tab-additional"',1)[0] if 'id="product-tab-description">' in s else ''
 desc=re.sub(r'<style[\s\S]*?</style>','',desc)
 lines=[html.unescape(re.sub('<[^>]+>','',x)).strip() for x in re.findall(r'<li[^>]*>([\s\S]*?)</li>',desc)]
 if not lines: lines=[html.unescape(re.sub('<[^>]+>',' ',x)).strip() for x in re.findall(r'<p[^>]*>([\s\S]*?)</p>',desc)]
 lines=[' '.join(x.split()) for x in lines if x and 'ILUSTRATIV' not in x.upper() and '\ufffd' not in x]
 result={**row,'description_lines':lines,'images':images,'checked_at':time.strftime('%Y-%m-%d')}
 if images:
  content=get(images[0]).content
  im=Image.open(io.BytesIO(content));result['width'],result['height']=im.size;result['image_bytes']=len(content)
 return result
with file.open('a',encoding='utf-8') as out,cf.ThreadPoolExecutor(max_workers=6) as pool:
 jobs={pool.submit(detail,index[sku]):sku for sku in needed if sku in index and sku not in known}
 for i,f in enumerate(cf.as_completed(jobs)):
  try: out.write(json.dumps(f.result(),ensure_ascii=False)+'\n');out.flush()
  except Exception as e: print('DETAIL_ERROR',jobs[f],str(e),flush=True)
  if i%50==0: print('Details',i+1,'/',len(jobs),flush=True)
print('DONE',flush=True)

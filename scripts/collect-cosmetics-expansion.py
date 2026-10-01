"""Read both complete cosmetics listings before selecting known facial-care lines."""
import requests,json,re,sys
from pathlib import Path
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parents[1]/'docs/cosmetics-completion-2026-10-01';OUT.mkdir(exist_ok=True)
jobs=[('atacado',i,'https://atacadousa.com.py/20-cosmeticos'+(f'?page={i}' if i>1 else '')) for i in range(1,7)]+[('star',i,'https://www.starcompany-py.com/100-cosmeticos'+(f'?page={i}' if i>1 else '')) for i in range(1,16)]
def listing(job):
 name,i,url=job;r=requests.get(url,timeout=40);r.raise_for_status();r.encoding='utf8';(OUT/f'{name}-all-{i}.html').write_text(r.text,encoding='utf8');s=BeautifulSoup(r.text,'html.parser');rows=[]
 for card in s.select('article.product-miniature'):
  a=card.select_one('a.product_name');pr=card.select_one('.price')
  if not a:continue
  title=a.get('title') or a.get_text(' ',strip=True);raw=pr.get_text(' ',strip=True) if pr else '';m=re.search(r'\d[\d.,]*',raw)
  price=float(m[0].replace('.','').replace(',','.')) if m and ',' in m[0] else float(m[0]) if m else None
  rows.append(dict(supplier=name,title=title,url=a['href'],price=price,listing_url=url,product_id=card.get('data-id-product')))
 return rows
allrows={}
with ThreadPoolExecutor(max_workers=4) as pool:
 for rs in pool.map(listing,jobs):allrows.update({r['url']:r for r in rs})
rows=list(allrows.values());(OUT/'all-listings.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
brands=['Beauty of Joseon','COSRX','Anua','Celimax','Dr. Althea','Numbuzin','VT Cosmetics','Round Lab','Torriden','Mixsoon','Tocobo','Some By Mi','Axis-Y','Banila Co']
patterns=['BEAUTY OF JOSEON','COSRX','ANUA','CELIMAX',r'DR.?\s*ALTHEA','NUMBUZIN',r'VT\s+(COSMETICS|REEDLE)','ROUND LAB','TORRIDEN','MIXSOON','TOCOBO','SOME BY MI','AXIS.?Y','BANILA']
chosen=[]
for r in rows:
 for brand,pat in zip(brands,patterns):
  if re.search(pat,r['title'],re.I):r['brand']=brand;chosen.append(r);break
def detail(r):
 try:
  resp=requests.get(r['url'],timeout=40);resp.raise_for_status();resp.encoding='utf8';(OUT/f"{r['supplier']}-detail-{r['product_id']}.html").write_text(resp.text,encoding='utf8');s=BeautifulSoup(resp.text,'html.parser');d=json.loads(s.select_one('#product-details[data-product]')['data-product'])
  title=next((h.get_text(' ',strip=True) for h in s.select('h1') if h.get_text(strip=True)),r['title'])
  r.update(title=title,price=d['price_amount'],quantity=d['quantity'],image_url=d['cover']['large']['url'],reference=d['reference'],checked_at=datetime.now(timezone.utc).isoformat())
 except Exception as e:r['error']=str(e)
 return r
with ThreadPoolExecutor(max_workers=4) as pool:chosen=list(pool.map(detail,chosen))
(OUT/'known-offers.json').write_text(json.dumps(chosen,ensure_ascii=False,indent=2),encoding='utf8')
print('Listings:',len(rows),'Known offers:',len(chosen),'Detail errors:',sum('error' in r for r in chosen))
for i,r in enumerate(chosen):print(i,r['supplier'],r['brand'],r['title'],r['price'],r.get('quantity'))

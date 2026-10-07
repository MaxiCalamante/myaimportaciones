"""Fresh read-only supplier review for high-value tool expansion, October 2."""
import json,re,sys,threading
from pathlib import Path
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf8')
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/tools-additions-2026-10-06';OUT.mkdir(exist_ok=True)
INDEX={r['sku']:r for r in json.loads((ROOT/'docs/tools-selection-2026-10-01/listings.json').read_text(encoding='utf8'))}
WANTED=['527330','501859','5890','542081','529112','542050','527347','162647','380980','67690','598286','615242','125765','527606','529129','3407','502016','59237','553278','436182','511919','495547','501828','490856','487795','468756','553834','529402','529426','301305','437240','615471','502276','441032']
LOCAL=threading.local()
def session():
 if not hasattr(LOCAL,'s'):
  LOCAL.s=requests.Session();LOCAL.s.get('https://www.totalherramientasoficial.com.py//set-country/py',timeout=30).raise_for_status()
 return LOCAL.s
def fetch(sku):
 row=INDEX[sku];r=session().get(row['url'],timeout=40);r.raise_for_status();r.encoding='utf8'
 (OUT/f'supplier-{sku}.html').write_text(r.text,encoding='utf8')
 s=BeautifulSoup(r.text,'html.parser');h=s.h1.get_text(' ',strip=True)
 price=s.select_one('.product-price');price_text=price.get_text(' ',strip=True) if price else ''
 m=re.search(r'USD\s*([\d.,]+)',price_text)
 usd=float(m[1].replace('.','').replace(',','.')) if m and ',' in m[1] else float(m[1]) if m else None
 desc=s.select_one('#product-tab-description')
 lines=list(dict.fromkeys(desc.stripped_strings)) if desc else []
 images=list(dict.fromkeys(re.findall(r'(?:src|href|data-zoom-image)="([^"]+/img/'+row['supplier_product_id']+r'/produtos/1500/[^"]+)"',r.text)))
 structured=[]
 for tag in s.select('script[type="application/ld+json"]'):
  try:
   d=json.loads(tag.get_text())
   if d.get('@type')=='Product' and str(d.get('sku') or d.get('productID'))==sku:structured.append(d)
  except (ValueError,AttributeError):pass
 meta=s.find('meta',attrs={'property':'product:availability'})
 return dict(sku=sku,title=h,url=row['url'],usd=usd,price_text=price_text,iva='CON I.V.A' in price_text,description_lines=lines,images=images,availability=meta.get('content') if meta else None,structured=structured,checked_at=datetime.now(timezone.utc).isoformat())
result=json.loads((OUT/'candidates.json').read_text(encoding='utf8')) if '--extend' in sys.argv else {};errors=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 jobs={pool.submit(fetch,k):k for k in WANTED if k not in result}
 for f in as_completed(jobs):
  try:r=f.result();result[r['sku']]=r
  except Exception as e:errors.append({'sku':jobs[f],'error':str(e)})
(OUT/'candidates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reviewed':len(result),'errors':errors,'candidates':[{'sku':r['sku'],'title':r['title'],'usd':r['usd'],'iva':r['iva'],'available':r['availability'],'images':len(r['images'])} for r in result.values()]},ensure_ascii=False,indent=2))





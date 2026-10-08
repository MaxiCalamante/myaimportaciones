import requests,json,re,concurrent.futures,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
def fetch(url):
 path=OUT/('market-'+hashlib.sha256(url.encode()).hexdigest()[:14]+'.html')
 if path.exists():h=path.read_text(encoding='utf8')
 else:
  r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=35);r.raise_for_status();h=r.text;path.write_text(h,encoding='utf8')
 return BeautifulSoup(h,'html.parser')
home=fetch('https://www.tecnoselect.com/')
urls={a['href'] for a in home.select('a[href]') if 'tecnoselect.com/' in a['href'] and re.search(r'/(mac|apple-iphone|ipad)/',a['href']) and '/blog/' not in a['href']}
urls.add('https://www.tecnoselect.com/apple-iphone/iphone17.html')
print('categories',len(urls),flush=True)
products={}
def listing(url):
 try:
  s=fetch(url);rows=[]
  for card in s.select('.product-item'):
   a=card.select_one('a.product-item-link');p=card.select_one('[data-price-amount]')
   if a and p:rows.append(dict(url=a['href'],title=a.get_text(' ',strip=True),listing_price=float(p['data-price-amount'])))
  nexts={a['href'] for a in s.select('.pages a[href]')}
  return rows,nexts
 except Exception as e:print('error',url,str(e),flush=True);return [],set()
visited=set();pending=urls
while pending-visited:
 batch=sorted(pending-visited)[:6]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
  for url,(rows,pages) in zip(batch,ex.map(listing,batch)):
   visited.add(url);pending|=pages
   for r in rows:products[r['url']]=r
 print('pages',len(visited),'products',len(products),flush=True)
 if len(visited)>65:break
def detail(row):
 try:
  s=fetch(row['url']);main=s.select_one('.product-info-main');title=s.select_one('h1');p=main.select_one('[data-price-amount]') if main else None
  sku=s.select_one('[itemprop=sku]');desc=s.select_one('#description');attrs=s.select_one('#product-attribute-specs-table')
  images=[]
  for script in s.select('script'):
   t=script.string or script.get_text()
   if 'mage/gallery/gallery' in t:
    try:
     for val in json.loads(t).values():
      if isinstance(val,dict) and 'mage/gallery/gallery' in val:
       images=[x['full'] for x in val['mage/gallery/gallery'].get('data',[]) if x.get('full')]
    except:pass
  return dict(**row,price=float(p['data-price-amount']) if p else None,main=main.get_text(' ',strip=True) if main else '',sku=sku.get_text(strip=True) if sku else None,attributes=attrs.get_text(' ',strip=True) if attrs else '',description=desc.get_text(' ',strip=True) if desc else '',images=images)
 except Exception as e:return dict(**row,error=str(e))
selected=[r for r in products.values() if re.search(r'iphone (13|14|15|16|17|18)|imac|mac mini|macbook|ipad',r['title'],re.I)]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 results=[]
 for i,r in enumerate(ex.map(detail,selected),1):
  results.append(r)
  if i%25==0:print('details',i,flush=True)
(OUT/'market-tecnoselect.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print('complete',len(results),flush=True)

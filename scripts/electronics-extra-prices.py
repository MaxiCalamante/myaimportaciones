import requests,json,concurrent.futures,re,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
urls=[
 'https://multipoint.com.ar/tienda/tablets/tablet-samsung-galaxy-tab-a11-lte-644gb-gray',
 'https://multipoint.com.ar/tienda/tablets/tablet-samsung-galaxy-tab-a11-1286gb-5g-gray',
 'https://www.opendata.ar/productos/tablet-samsung-galaxy-tab-s10-lite-6-128gb-5g-grey-wi-fi-sm-x406b-ofei9/',
 'https://www.computools.com.ar/productos/tablet-samsung-galaxy-tab-a11-87-sm-x135g-4-gb-64gb-gray-lte/',
]
def read(u):
 try:
  response=requests.get(u,timeout=35);response.raise_for_status();h=response.text;(OUT/('extra-price-'+hashlib.sha256(u.encode()).hexdigest()[:12]+'.html')).write_text(h,encoding='utf8');s=BeautifulSoup(h,'html.parser')
  data=[]
  for el in s.select('script[type="application/ld+json"]'):
   try:data.append(json.loads(el.string or el.get_text()))
   except Exception:pass
  text=s.get_text(' ',strip=True);return {'url':u,'title':s.title.get_text(' ',strip=True),'jsonld':data,'text':text}
 except Exception as e:return {'url':u,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:rows=list(p.map(read,urls))
(OUT/'extra-prices.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
for r in rows:print(json.dumps({**r,'text':r.get('text','')[:1900]},ensure_ascii=False))

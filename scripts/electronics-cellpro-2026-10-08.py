import requests,json,hashlib,concurrent.futures
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
base='https://cellpro.com.ar/'
h=requests.get(base,timeout=40).text
(OUT/'cellpro-home.html').write_text(h,encoding='utf8')
s=BeautifulSoup(h,'html.parser')
links={urljoin(base,a['href']) for a in s.select('a[href]') if any(k in a.get_text(' ',strip=True).lower() for k in ['galaxy a','samsung a','iphone','galaxy s26']) and a.get_text(' ',strip=True).lower()!='iphone'}
def fetch(u):
 try:
  h=requests.get(u,timeout=40).text;(OUT/('cellpro-'+hashlib.sha256(u.encode()).hexdigest()[:12]+'.html')).write_text(h,encoding='utf8')
  s=BeautifulSoup(h,'html.parser');title=s.title.get_text(' ',strip=True);main=s.get_text(' ',strip=True)
  imgs=[dict(url=urljoin(u,i.get('data-src') or i.get('src')),alt=i.get('alt','')) for i in s.select('img') if i.get('data-src') or i.get('src')]
  return dict(url=u,title=title,text=main,images=imgs)
 except Exception as e:return dict(url=u,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(fetch,sorted(links)))
(OUT/'cellpro.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
for r in rows:print(r.get('title'),r['url'],r.get('text','')[:2000])

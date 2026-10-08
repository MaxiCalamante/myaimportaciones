import requests,json,re,concurrent.futures
from bs4 import BeautifulSoup
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
pages={
 'a07blacknz':'https://www.samsung.com/nz/smartphones/galaxy-a/galaxy-a07-black-64gb-sm-a075fzkdxnz/',
 'a17grayuk':'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a17-grey-128gb-sm-a175fzabeub/',
 'a17blackuk':'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a17-black-128gb-sm-a175fzkbeub/',
 'a17blueuk':'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a17-light-blue-128gb-sm-a175flbbeub/',
 's26spec':'https://www.samsung.com/ie/smartphones/galaxy-s26/specs/',
 'iphone16ewhite':'https://istyle.ae/iphone-16e-128gb-white.html',
 'samsungAR':'https://shop.samsung.com/ar/galaxy-a07-128gb/p?skuId=139476',
}
def fetch(item):
 key,u=item
 try:
  f=OUT/('more-'+key+'.html')
  if f.exists():h=f.read_text(encoding='utf8')
  else:r=requests.get(u,timeout=45);r.raise_for_status();h=r.text;f.write_text(h,encoding='utf8')
  s=BeautifulSoup(h,'html.parser');imgs=[]
  for i in s.select('img'):
   src=i.get('data-src') or i.get('data-desktop-src') or i.get('src')
   if src:imgs.append(dict(url=src,alt=i.get('alt','')))
  gallery=list(dict.fromkeys(re.findall(r'https?://images\.samsung\.com/is/image/samsung/[^\s"<>?]+/gallery/[^\s"<>?]+',h)))
  return dict(key=key,url=u,title=s.title.get_text(' ',strip=True),images=imgs,gallery=gallery)
 except Exception as e:return dict(key=key,url=u,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(fetch,pages.items()))
(OUT/'more-media.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print([(r['key'],r.get('title'),len(r.get('gallery',[])),r.get('error')) for r in rows])

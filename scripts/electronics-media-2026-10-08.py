import requests,json,re,concurrent.futures
from bs4 import BeautifulSoup
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
pages={
 'iphone18':'https://www.apple.com/shop/buy-iphone/iphone-18-pro',
 'iphone17':'https://www.apple.com/shop/buy-iphone/iphone-17',
 'iphone17pro':'https://www.apple.com/shop/buy-iphone/iphone-17-pro',
 'iphone17e':'https://www.apple.com/shop/buy-iphone/iphone-17e',
 'iphone16':'https://www.apple.com/shop/buy-iphone/iphone-16',
 'ipada16':'https://www.apple.com/shop/buy-ipad/ipad',
 'ipadair':'https://www.apple.com/shop/buy-ipad/ipad-air',
 'ipadpro':'https://www.apple.com/shop/buy-ipad/ipad-pro',
 'imac':'https://www.apple.com/shop/buy-mac/imac',
 'macmini':'https://www.apple.com/shop/buy-mac/mac-mini',
 'macair':'https://www.apple.com/shop/buy-mac/macbook-air',
 'macpro':'https://www.apple.com/shop/buy-mac/macbook-pro',
 'macneo':'https://www.apple.com/shop/buy-mac/macbook-neo',
 'a37':'https://www.samsung.com/levant/smartphones/galaxy-a/galaxy-a37-5g-awesome-graygreen-128gb-sm-a376bdgmmea/',
 'a57':'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a57-5g-awesome-navy-256gb-sm-a576bdbdeub/',
 'a17':'https://www.samsung.com/mx/smartphones/galaxy-a/galaxy-a17-lte-light-blue-256gb-sm-a175flbkltm/',
 'a07':'https://www.samsung.com/br/smartphones/galaxy-a/galaxy-a07-green-128gb-sm-a075mzggzto/',
 'a16':'https://www.samsung.com/br/smartphones/galaxy-a/galaxy-a16-black-128gb-sm-a165mzkdzto/',
 'a27':'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a27-5g-black-128gb-sm-a276bzkbeub/',
 'tabs10':'https://www.samsung.com/ie/tablets/galaxy-tab-s/galaxy-tab-s10-lite-grey-128gb-wi-fi-sm-x400nzareub/',
 'taba11':'https://www.samsung.com/latin/support/model/SM-X135NZSAGTO/',
 'taba11plus':'https://www.samsung.com/latin/support/model/SM-X236BZSAGTO/',
 's26plus':'https://www.samsung.com/uk/smartphones/galaxy-s26/buy/',
}
def page(item):
 key,url=item
 try:
  file=OUT/('official-'+key+'.html')
  if file.exists():h=file.read_text(encoding='utf8')
  else:
   r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=40);r.raise_for_status();h=r.text;file.write_text(h,encoding='utf8')
  soup=BeautifulSoup(h,'html.parser');imgs=[]
  for img in soup.select('img'):
   src=img.get('data-src') or img.get('data-desktop-src') or img.get('src')
   if src and ('apple' in src or 'samsung' in src):imgs.append(dict(url=src,alt=img.get('alt','')))
  # Apple purchase selectors store variant galleries in embedded data.
  embedded=list(dict.fromkeys(re.findall(r'https://(?:store\.storeimages\.cdn-apple\.com|images\.samsung\.com)[^\s"<>\\]+',h)))
  return dict(key=key,url=url,title=soup.title.get_text() if soup.title else '',images=imgs,embedded=embedded)
 except Exception as e:return dict(key=key,url=url,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:results=list(ex.map(page,pages.items()))
(OUT/'official-media.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
for r in results:print(r['key'],r.get('title',r.get('error')),len(r.get('images',[])),len(r.get('embedded',[])),flush=True)

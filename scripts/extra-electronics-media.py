import requests,json,re,concurrent.futures
from pathlib import Path
from bs4 import BeautifulSoup
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
pages={
 'a07black':'https://www.samsung.com/br/smartphones/galaxy-a/galaxy-a07-black-128gb-sm-a075mzkdzto/',
 'a16gray':'https://www.samsung.com/br/smartphones/galaxy-a/galaxy-a16-light-gray-128gb-sm-a165mzadzto/',
 'a16green':'https://www.samsung.com/br/smartphones/galaxy-a/galaxy-a16-light-green-256gb-sm-a165mlgizto/',
 'a17black':'https://www.samsung.com/mx/smartphones/galaxy-a/galaxy-a17-lte-black-128gb-sm-a175fzkiltm/',
 'a17gray':'https://www.samsung.com/mx/smartphones/galaxy-a/galaxy-a17-lte-gray-128gb-sm-a175fzailtm/',
 'a17blue':'https://www.samsung.com/my/smartphones/galaxy-a/galaxy-a17-light-blue-256gb-sm-a175flboxme/',
 'taba11silver':'https://www.samsung.com/ie/tablets/galaxy-tab-a/galaxy-tab-a11-silver-64gb-lte-sm-x135fzsaeub/',
 'taba11gray':'https://www.samsung.com/ie/tablets/galaxy-tab-a/galaxy-tab-a11-grey-64gb-lte-sm-x135fzaaeub/',
 'taba11plussilver':'https://www.samsung.com/ie/tablets/galaxy-tab-a/galaxy-tab-a11-plus-silver-128gb-5g-sm-x236bzsreub/',
 'taba11plusgray':'https://www.samsung.com/ie/tablets/galaxy-tab-a/galaxy-tab-a11-plus-grey-128gb-5g-sm-x236bzareub/',
 'tabs10cell':'https://www.samsung.com/ie/tablets/galaxy-tab-s/galaxy-tab-s10-lite-grey-128gb-5g-sm-x406bzareub/',
 's26plusblue':'https://www.samsung.com/sa_en/smartphones/galaxy-s/galaxy-s26-plus-sky-blue-512gb-sm-s947blbomea/',
 'iphone13pro':'https://www.tecnoselect.com/iphone-13-pro-128gb-graphite.html',
 'iphone14promax':'https://www.tecnoselect.com/iphone-14-pro-max-128gb-space-black.html',
 'iphone15':'https://www.tecnoselect.com/iphone-15-256gb-green.html',
 'iphone15pro':'https://www.tecnoselect.com/iphone-15-pro-256gb-black-titanium.html',
 'iphone15promax':'https://www.tecnoselect.com/iphone-15-pro-max-256gb-natural-titanium.html',
 'iphone16e':'https://www.apple.com/shop/buy-iphone/iphone-16e',
}
def load(item):
 key,url=item
 try:
  path=OUT/f'official-{key}.html'
  if path.exists():h=path.read_text(encoding='utf8')
  else:
   r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=30);r.raise_for_status();h=r.text;path.write_text(h,encoding='utf8')
  s=BeautifulSoup(h,'html.parser');imgs=[]
  for img in s.select('img'):
   u=img.get('data-src') or img.get('src')
   if u:imgs.append(dict(url=u,alt=img.get('alt','')))
  gallery=list(dict.fromkeys(u.split('?')[0] for u in re.findall(r'(?:(?:https:)?//images\.samsung\.com/is/image/samsung/p6pim/)[^\s"<>\\]+',h) if '/gallery/' in u and '-thumb-' not in u))
  return dict(key=key,url=url,title=s.title.get_text() if s.title else '',images=imgs,gallery=gallery)
 except Exception as e:return dict(key=key,url=url,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:rows=list(ex.map(load,pages.items()))
(OUT/'extra-media.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
for r in rows:print(r['key'],len(r.get('gallery',[])),r.get('title',r.get('error')),flush=True)

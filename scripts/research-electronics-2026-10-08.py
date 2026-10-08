import requests,json,re,concurrent.futures,time
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
HEAD={'User-Agent':'Mozilla/5.0'}
def fetch(url,key):
    path=OUT/(key+'.html')
    if path.exists(): return BeautifulSoup(path.read_text(encoding='utf8'),'html.parser')
    r=requests.get(url,headers=HEAD,timeout=40);r.raise_for_status();r.encoding='utf8'
    path.write_text(r.text,encoding='utf8');return BeautifulSoup(r.text,'html.parser')
home=fetch('https://atacadousa.com.py/','home')
links={a['href'] for a in home.select('a[href]') if re.search(r'\d+-(smartphones|informatica|tablets|computadores|notebooks)',a['href'])}
print('categories',sorted(links),flush=True)
offers={}
def listing(url):
    s=fetch(url,'listing-'+re.sub(r'\W','-',url.split('/')[-1]))
    cards=[]
    for a in s.select('article.product-miniature'):
        link=a.select_one('h3 a') or a.select_one('a.product_name')
        if link: cards.append(dict(url=link['href'],title=link.get_text(' ',strip=True),id=a.get('data-id-product')))
    pages={urljoin(url,a['href']) for a in s.select('.pagination a[href]') if 'page=' in a['href']}
    return cards,pages
pending=set(links)|{'https://atacadousa.com.py/18-smartphones'};visited=set()
while pending:
    batch=list(pending-visited)[:6]
    if not batch:break
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        for url,result in zip(batch,ex.map(listing,batch)):
            visited.add(url);cards,pages=result;pending|=pages
            for card in cards: offers[card['url']]=card
    print('pages',len(visited),'offers',len(offers),flush=True)
    if len(visited)>70:break
(OUT/'listing-offers.json').write_text(json.dumps(list(offers.values()),ensure_ascii=False,indent=2),encoding='utf8')
rows=json.loads((OUT/'source.json').read_text(encoding='utf8'))
def detail(card):
    try:
        s=fetch(card['url'],'product-'+str(card['id']))
        data=s.select_one('#product-details')
        product=json.loads(data.get('data-product','{}')) if data else {}
        sku=product.get('reference')
        if not sku:
            elem=s.select_one('.product-reference span');sku=elem.get_text(strip=True) if elem else None
        if not any(r['sku']==sku for r in rows):return None
        images=[]
        for img in s.select('.images-container img, .product-cover img'):
            u=img.get('data-image-large-src') or img.get('src')
            if u and u not in images:images.append(u)
        d=s.select_one('.product-description')
        return dict(**card,sku=sku,images=images,description=d.get_text(' ',strip=True) if d else '',product=product)
    except Exception as e:return dict(**card,error=str(e))
found=[]
candidates=[c for c in offers.values() if re.search(r'iphone|apple|samsung',c['title'],re.I)]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    for i,r in enumerate(ex.map(detail,candidates),1):
        if r:found.append(r)
        if i%20==0:print('details',i,'matched',len([x for x in found if x.get('sku')]),flush=True)
(OUT/'supplier.json').write_text(json.dumps(found,ensure_ascii=False,indent=2),encoding='utf8')
print('matched',len([x for x in found if x.get('sku')]),'of',len(rows),flush=True)

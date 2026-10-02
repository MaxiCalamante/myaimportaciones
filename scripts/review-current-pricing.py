"""Read-only refresh of every loaded product's exact supplier links; resumable evidence."""
import concurrent.futures as cf
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf8')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/pricing-review-2026-10-02'
DATA = json.loads((OUT/'catalog-before.json').read_text(encoding='utf8'))
COSTS = {c['product_id']:c for c in DATA['costs']}

def refresh():
    links = {}
    for p in DATA['products']:
        c = COSTS[p['id']]
        links[p['id']] = list(dict.fromkeys(u for u in [p['source_url'],c['supplier_url']] if u))
    for name in ['supplier-import-2026-10-01/reviewed-catalog.json','cosmetics-completion-2026-10-01/selection.json']:
        for p in json.loads((ROOT/'docs'/name).read_text(encoding='utf8')):
            if p['id'] in links:
                links[p['id']] = list(dict.fromkeys(links[p['id']]+[o['url'] for o in p['offers']]))
    urls = list(dict.fromkeys(u for us in links.values() for u in us))
    cachefile = OUT/'supplier-live.json'
    known = json.loads(cachefile.read_text(encoding='utf8')) if cachefile.exists() else {}
    def one(url):
        row = dict(url=url,checked_at=datetime.now(timezone.utc).isoformat())
        try:
            r=requests.get(url,timeout=30,headers={'User-Agent':'Mozilla/5.0 MYA-pricing-review/1.0'});r.raise_for_status()
            r.encoding='utf8';s=BeautifulSoup(r.text,'html.parser')
            import hashlib
            (OUT/('supplier-'+hashlib.sha256(url.encode()).hexdigest()[:16]+'.html')).write_text(r.text,encoding='utf8')
            e=s.select_one('#product-details[data-product]')
            if e:
                d=json.loads(e['data-product'])
                h=next((h.get_text(' ',strip=True) for h in s.select('h1') if h.get_text(strip=True)),d.get('name'))
                row.update(title=h,usd=d.get('price_amount'),quantity=d.get('quantity'),reference=d.get('reference'),currency='USD',method='product_details_json')
            elif 'totalherramientasoficial' in url:
                sku=next(p['sku'] for p in DATA['products'] if url in links[p['id']])
                # Use primary structured offer only, matching SKU and currency.
                structured=[]
                for tag in s.select('script[type="application/ld+json"]'):
                    try:
                        value=json.loads(tag.get_text())
                        if value.get('@type')=='Product' and str(value.get('productID') or value.get('sku'))==sku:
                            structured.append(value)
                    except (ValueError,AttributeError):pass
                if len(structured)==1 and structured[0].get('offers',{}).get('priceCurrency')=='USD':
                    item=structured[0];offer=item['offers']
                    row.update(title=item['name'],usd=float(offer['price']),currency='USD',reference=sku,quantity=None,availability=offer.get('availability'),method='primary_exact_sku_structured_offer')
                    return row
                # Search card must match the exact supplier SKU, not a related product.
                sr=requests.get('https://www.totalherramientasoficial.com.py/produtos',params={'busca':sku},timeout=30);sr.raise_for_status()
                ss=BeautifulSoup(sr.content,'html.parser')
                card=ss.select_one('[data-item_codigo="'+sku+'"]')
                if card and card.get('data-item_preco'):
                    raw=card['data-item_preco'];n=float(raw.replace('.','').replace(',','.')) if ',' in raw else float(raw)
                    parent=card.find_parent('div',class_='product')
                    row.update(title=parent.get_text(' ',strip=True)[:350] if parent else sku,usd=n,currency=card.get('data-item_moeda') or 'USD',reference=sku,quantity=None,method='exact_sku_listing')
                else: row['error']='No displayed current price for exact SKU'
            else: row['error']='Missing primary product data'
            if row.get('usd') is not None:
                row['usd']=float(row['usd'])
                if row['usd']<=0: row['error']='Invalid supplier price'
        except Exception as exc: row['error']=str(exc)
        return row
    pending=[u for u in urls if u not in known]
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for i,row in enumerate(pool.map(one,pending),1):
            known[row['url']]=row
            cachefile.write_text(json.dumps(known,ensure_ascii=False,indent=2),encoding='utf8')
            if i%20==0 or i==len(pending): print('Supplier',i,'/',len(pending),'errors',sum(bool(x.get('error')) for x in known.values()),flush=True)
    (OUT/'product-supplier-links.json').write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf8')
    print('Products',len(links),'links',len(urls),'with current price',sum(any(not known[u].get('error') for u in us) for us in links.values()),flush=True)

if __name__=='__main__': refresh()

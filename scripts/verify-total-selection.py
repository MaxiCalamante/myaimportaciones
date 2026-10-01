"""Audit the applied batch against its snapshot and the anonymous public storefront."""
import json,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
from datetime import datetime
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-selection-2026-10-01'
before=json.loads((OUT/'before.json').read_text(encoding='utf-8'))
after=json.loads((OUT/'after.json').read_text(encoding='utf-8'))
payload=json.loads((OUT/'payload.json').read_text(encoding='utf-8'))
selection=json.loads((OUT/'selection.json').read_text(encoding='utf-8'))
by_id={p['id']:p for p in after['products']};costs={c['product_id']:c for c in after['costs']}
def equal(key,a,b):
 return datetime.fromisoformat(a)==datetime.fromisoformat(b) if key.endswith('_at') and a and b else a==b
assert len(after['products'])==len(before['products'])+len(payload['products'])
for p in before['products']:assert by_id[p['id']]==p,('prior product changed',p['id'])
for c in before['costs']:assert costs[c['product_id']]==c,('prior private cost changed',c['product_id'])
for p in payload['products']:
 for key,value in p.items():assert equal(key,by_id[p['id']][key],value),(p['sku'],key)
for c in payload['costs']:
 for key,value in c.items():assert equal(key,costs[c['product_id']][key],value),(c['product_id'],key)
for c in payload['category_updates']:
 actual=next(x for x in after['categories'] if x['id']==c['id'])
 for key,value in c.items():assert actual[key]==value,(c['id'],key)
for c in before['categories']:
 if c['id'] not in {x['id'] for x in payload['category_updates']}:
  assert c==next(x for x in after['categories'] if x['id']==c['id'])
assert len({p['sku'] for p in payload['products']})==60
published=[p for p in payload['products'] if p['is_active']]
assert len(published)>=50
for p in published:
 alternatives=[o for o in published if o['model']==p['specifications']['Modelo alternativo'] and o['category_id']==p['category_id']]
 assert len(alternatives)==1 and alternatives[0]['specifications']['Modelo alternativo']==p['model'],p['model']
 assert p['stock']==0 and p['stock_verified_at'] is None and p['fulfillment_mode']=='supplier'
 assert p['retail_price']>costs[p['id']]['origin_cost']*1550
def check(p):
 url='https://myaimportaciones.vercel.app/producto/'+p['slug']
 r=requests.get(url,timeout=50)
 assert r.status_code==(200 if p['is_active'] else 404),(p['sku'],r.status_code)
 if not p['is_active']:return {'sku':p['sku'],'published':False,'http':404}
 s=BeautifulSoup(r.text,'html.parser');assert s.h1.get_text(strip=True)==p['title'],p['sku']
 ld=[json.loads(x.string) for x in s.select('script[type="application/ld+json"]') if x.string]
 product=next(x for x in ld if x.get('@type')=='Product')
 assert product['offers']['price']==p['retail_price'] and product['offers']['priceCurrency']=='ARS',p['sku']
 assert p['source_url'] not in r.text and 'origin_cost' not in r.text and 'product_costs' not in r.text,p['sku']
 return {'sku':p['sku'],'published':True,'http':200,'correct_price':True,'supplier_link_private':True}
with ThreadPoolExecutor(max_workers=6) as pool:pages=list(pool.map(check,payload['products']))
(OUT/'public-pages-private.json').write_text(json.dumps(pages,indent=2),encoding='utf-8')
result=dict(loaded=len(payload['products']),published=len(published),drafts=len(payload['products'])-len(published),pairs_published=len(published)//2,prior_products_preserved=len(before['products']),prior_costs_preserved=len(before['costs']),stock_own_units_claimed=0,source_links_private=True,all_public_pages_http_200=True,all_drafts_http_404=True,all_public_prices_correct=True,market_references_published=sum(bool(r['reference']) for r in selection if r['published']),provisional_prices_without_ml=sum(not r['reference'] for r in selection if r['published']),images=json.loads((OUT/'media-verification.json').read_text(encoding='utf-8')))
(OUT/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))

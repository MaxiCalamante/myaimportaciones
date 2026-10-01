import json,re,requests,sys
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime,timezone
sys.stdout.reconfigure(encoding='utf8')
out=Path(__file__).resolve().parents[1]/'docs/cosmetics-completion-2026-10-01'
allrows=json.loads((out/'all-listings.json').read_text(encoding='utf8'))
offers=json.loads((out/'known-offers.json').read_text(encoding='utf8'))
for ident,brand in [('17651','Tree Hut'),('10245',"Victoria's Secret"),('8301',"Victoria's Secret")]:
 if any(x['product_id']==ident and x['supplier']=='star' for x in offers):continue
 row=next(x for x in allrows if x['product_id']==ident and x['supplier']=='star')
 r=requests.get(row['url'],timeout=40);r.raise_for_status();r.encoding='utf8'
 (out/f'star-detail-{ident}.html').write_text(r.text,encoding='utf8')
 s=BeautifulSoup(r.text,'html.parser');d=json.loads(s.select_one('#product-details[data-product]')['data-product'])
 row.update(title=s.select_one('h1').get_text(' ',strip=True),price=d['price_amount'],quantity=d['quantity'],image_url=d['cover']['large']['url'],reference=d['reference'],checked_at=datetime.now(timezone.utc).isoformat(),brand=brand)
 offers.append(row)
(out/'known-offers.json').write_text(json.dumps(offers,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([dict(index=i,**x) for i,x in enumerate(offers) if i>=46],ensure_ascii=False,indent=2))

"""Read current Total supplier listings; no database or inventory mutations."""
import json, re, sys, time
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-selection-2026-10-01'
OUT.mkdir(exist_ok=True)
BASE='https://www.totalherramientasoficial.com.py'
STAMP=datetime.now(timezone.utc).isoformat()

def page(number):
    cache=OUT/f'listing-{number}.html'
    if cache.exists():text=cache.read_text(encoding='utf-8')
    else:
        for attempt in range(3):
            try:
                r=requests.get(BASE+'/produtos',params={'pagina':number},timeout=35)
                r.raise_for_status();r.encoding='utf-8';text=r.text;break
            except requests.RequestException:
                if attempt==2:raise
                time.sleep(attempt+1)
        cache.write_text(text,encoding='utf-8')
    soup=BeautifulSoup(text,'html.parser');rows=[]
    for card in soup.select('div.product'):
        fields=card.select('[data-item_codigo][data-item_preco]')
        field=next((f for f in fields if f.get('data-item_preco')),None) or next(iter(fields),None)
        link=card.select_one('a[href*="/produto/"]')
        title=card.select_one('.product-name') or card.select_one('h3')
        if not field or not link:continue
        name=title.get_text(' ',strip=True) if title else link.get('title','').replace('Total Herramientas Oficial','').strip()
        if not name:continue
        price=field.get('data-item_preco');currency=field.get('data-item_moeda')
        img=card.select_one('img');image=img.get('data-original') or img.get('src') if img else None
        rows.append(dict(sku=field['data-item_codigo'],supplier_product_id=field.get('data-item_id'),title=name,url=link['href'],usd=float(price.replace(',','.')) if price else None,currency=currency,image=image,listing_page=number,checked_at=STAMP))
    return rows

allrows={};errors=[]
with ThreadPoolExecutor(max_workers=6) as pool:
    jobs={pool.submit(page,n):n for n in range(1,166)}
    for i,f in enumerate(as_completed(jobs),1):
        try:
            for row in f.result():allrows[row['sku']]=row
        except Exception as e:errors.append(dict(page=jobs[f],error=str(e)))
        if i%25==0:print(f'Paginas {i}/165; productos {len(allrows)}',flush=True)
(OUT/'listings.json').write_text(json.dumps(list(allrows.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'listing-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(products=len(allrows),errors=errors),ensure_ascii=False))

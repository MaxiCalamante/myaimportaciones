"""Collect live Medicube/SKIN1004 offers. Read-only; preserve dated HTML evidence."""
import concurrent.futures as cf
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/supplier-import-2026-10-01'
OUT.mkdir(parents=True, exist_ok=True)
CHECKED = datetime.now(timezone.utc).isoformat()

def fetch(url, filename):
    r = requests.get(url, timeout=40, headers={'User-Agent': 'Mozilla/5.0 MYA-catalog-review/1.0'})
    r.raise_for_status()
    r.encoding = 'utf-8'
    (OUT / filename).write_text(r.text, encoding='utf-8')
    return BeautifulSoup(r.text, 'html.parser')

def number(text):
    m = re.search(r'\d[\d.,]*', text)
    if not m: return None
    return float(m[0].replace('.', '').replace(',', '.')) if ',' in m[0] else float(m[0])

def listing(supplier, url):
    offers, visited, pending = {}, set(), [url]
    while pending:
        page = pending.pop(0)
        if page in visited: continue
        visited.add(page)
        soup = fetch(page, f'{supplier}-listing-{len(visited)}-{abs(hash(url))}.html')
        for card in soup.select('article.product-miniature'):
            link = card.select_one('a.product_name')
            if not link: continue
            title = link.get('title') or link.get_text(' ', strip=True)
            if not re.search(r'MEDICUBE|SKIN\s*1004', title, re.I): continue
            brand = 'Medicube' if re.search('MEDICUBE', title, re.I) else 'SKIN1004'
            price = card.select_one('.price')
            stock = card.select_one('.in-stock')
            stock_match = re.search(r'(\d+)\s+In Stock', stock.get_text(' ', strip=True), re.I) if stock else None
            image = card.select_one('img')
            product_url = urljoin(page, link['href'])
            offers[product_url] = dict(supplier=supplier, brand=brand, title=title, url=product_url,
                product_id=card.get('data-id-product'), price=number(price.get_text()) if price else None,
                currency='USD', quantity=int(stock_match[1]) if stock_match else None,
                availability='in_stock' if stock_match and int(stock_match[1]) > 0 else 'unknown',
                image_url=image.get('data-full-size-image-url') or image.get('data-src') if image else None,
                listing_url=page, checked_at=CHECKED)
        for a in soup.select('.pagination a[href]'):
            dest = urljoin(page, a['href'])
            if 'page=' in dest and dest not in visited: pending.append(dest)
        print(supplier, len(visited), len(offers), flush=True)
    return list(offers.values())

def detail(offer):
    try:
        soup = fetch(offer['url'], f"{offer['supplier']}-product-{offer['product_id']}.html")
        h1 = next((h for h in soup.select('h1') if h.get_text(strip=True)), None)
        if h1: offer['title'] = h1.get_text(' ', strip=True)
        price = soup.select_one('.product-prices .current-price-value')
        if price:
            raw = price.get('content') or price.get_text(' ', strip=True)
            offer['price'] = number(raw)
        ref = soup.select_one('.product-reference span[itemprop=sku], .product-reference span')
        if ref: offer['sku'] = ref.get_text(' ', strip=True)
        pd = soup.select_one('#product-details[data-product]')
        if pd:
            data = json.loads(pd['data-product'])
            offer['sku'] = data.get('reference') or offer.get('sku')
            offer['ean13'] = data.get('ean13') or None
            offer['detail_quantity'] = data.get('quantity')
            if isinstance(data.get('quantity'), int):
                offer['quantity'] = data['quantity']
                offer['availability'] = 'in_stock' if data['quantity'] > 0 else 'out_of_stock'
            image = data.get('cover', {})
            offer['image_url'] = image.get('large', {}).get('url') or offer['image_url']
            offer['images'] = [i.get('large', {}).get('url') for i in data.get('images', []) if i.get('large', {}).get('url')]
        return offer
    except Exception as e:
        return {**offer, 'detail_error': str(e)}

def main():
    # Search by title too: supplier manufacturer fields can be wrong.
    jobs = [('atacado','https://atacadousa.com.py/20-cosmeticos'),
            ('star','https://www.starcompany-py.com/brand/373-medicube'),
            ('star','https://www.starcompany-py.com/pesquisa?order=product.position.desc&s=skin')]
    offers = {}
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        for rows in pool.map(lambda j: listing(*j), jobs):
            offers.update({r['url']:r for r in rows})
    (OUT/'offers-listing.json').write_text(json.dumps(list(offers.values()),ensure_ascii=False,indent=2),encoding='utf-8')
    detailed=[]
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for i, row in enumerate(pool.map(detail, offers.values()),1):
            detailed.append(row)
            if i%10==0: print('details',i,'/',len(offers),flush=True)
    (OUT/'offers.json').write_text(json.dumps(detailed,ensure_ascii=False,indent=2),encoding='utf-8')
    print('TOTAL',len(detailed), 'ERRORS',sum('detail_error' in r for r in detailed),flush=True)

if __name__ == '__main__': main()

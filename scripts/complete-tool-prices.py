"""Fill exact SKU prices from supplier detail URLs missing in the listing snapshot."""

import concurrent.futures as futures
import json
import time
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path("docs/pricing-review")
TODAY = date.today().isoformat()
SOURCE = ROOT / f"supplier-prices-{TODAY}.json"
CHECKPOINT = ROOT / f"tool-details-{TODAY}.json"


def fetch(item):
    sku, url = item
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=25, headers={"User-Agent": "MYA-pricing-audit/1.0"})
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            for field in soup.select("[data-item_codigo][data-item_preco]"):
                if field.get("data-item_codigo") == sku and field.get("data-item_preco"):
                    return sku, {"sku": sku, "price": float(field["data-item_preco"].replace(",", ".")), "currency": field.get("data-item_moeda") or "USD", "url": url, "checked_at": TODAY}
            return sku, {"error": "exact_sku_price_not_found", "url": url}
        except requests.RequestException as exc:
            if attempt == 2:
                return sku, {"error": str(exc), "url": url}
            time.sleep(1 + attempt)


def main():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    index = json.loads(Path("docs/catalog-audit/supplier-index.json").read_text(encoding="utf-8"))
    products = json.loads(Path("docs/catalog-audit/products-after.json").read_text(encoding="utf-8"))
    needed = {str(p.get("sku")) for p in products if p.get("is_active") and p.get("sku") in index} - set(source["tools"])
    done = json.loads(CHECKPOINT.read_text(encoding="utf-8")) if CHECKPOINT.exists() else {}
    pending = [(sku, index[sku]["url"]) for sku in needed if sku not in done]
    print(f"Exact detail checks pending: {len(pending)}", flush=True)
    with futures.ThreadPoolExecutor(max_workers=6) as pool:
        jobs = [pool.submit(fetch, item) for item in pending]
        for completed, job in enumerate(futures.as_completed(jobs), 1):
            sku, result = job.result()
            done[sku] = result
            if completed % 50 == 0 or completed == len(jobs):
                CHECKPOINT.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8")
                print(f"Exact details {completed}/{len(jobs)}; priced {sum('price' in value for value in done.values())}; errors {sum('error' in value for value in done.values())}", flush=True)
    for sku, row in done.items():
        if "price" in row:
            source["tools"][sku] = row
        else:
            source["errors"].append({"source": "tools_detail", "sku": sku, **row})
    SOURCE.write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Merged tool prices: {len(source['tools'])}", flush=True)


if __name__ == "__main__":
    main()

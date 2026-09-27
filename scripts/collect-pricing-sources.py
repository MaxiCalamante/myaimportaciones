"""Read current supplier listings for the pricing review. Never writes to the shop database."""

import concurrent.futures as futures
import csv
import json
import re
import time
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path("docs/pricing-review")
ROOT.mkdir(parents=True, exist_ok=True)
TODAY = date.today().isoformat()
TOOLS_BASE = "https://www.totalherramientasoficial.com.py/produtos?pagina="
BEAUTY_CSV = Path("docs/costos-proveedores-pendientes.csv")


def get(url):
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=25, headers={"User-Agent": "MYA-pricing-audit/1.0"})
            response.raise_for_status()
            return response.text
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def price_number(value):
    match = re.search(r"\d[\d.,]*", value.replace("\xa0", ""))
    if not match:
        return None
    number = match.group()
    if "," in number:
        number = number.replace(".", "").replace(",", ".")
    return float(number)


def tools_page(page):
    soup = BeautifulSoup(get(f"{TOOLS_BASE}{page}"), "html.parser")
    found = []
    for card in soup.select("div.product"):
        item = card.select_one("[data-item_codigo][data-item_preco]")
        link = card.select_one('a[href*="/produto/"]')
        if not item or not link:
            continue
        sku = item.get("data-item_codigo", "")
        raw = item.get("data-item_preco", "")
        amount = price_number(raw)
        if sku and amount is not None and amount > 0:
            found.append({"sku": sku, "price": amount, "currency": item.get("data-item_moeda") or "USD", "url": link.get("href"), "checked_at": TODAY})
    return page, found


def beauty_product(row):
    url = row["url_proveedor"]
    soup = BeautifulSoup(get(url), "html.parser")
    element = soup.select_one(".product-prices .current-price-value")
    amount = price_number(element.get_text(" ", strip=True)) if element else None
    return {"sku": row["sku_proveedor"], "price": amount, "currency": "USD", "url": url, "checked_at": TODAY, "supplier_title": row["producto"]}


def main():
    errors = []
    tools = {}
    with futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(tools_page, page): page for page in range(1, 166)}
        for completed, job in enumerate(futures.as_completed(jobs), 1):
            page = jobs[job]
            try:
                _, rows = job.result()
                for row in rows:
                    previous = tools.get(row["sku"])
                    if previous and previous["price"] != row["price"]:
                        errors.append({"source": "tools", "sku": row["sku"], "error": "conflicting_prices"})
                    tools[row["sku"]] = row
            except Exception as exc:
                errors.append({"source": "tools", "page": page, "error": str(exc)})
            if completed % 20 == 0 or completed == len(jobs):
                print(f"Tools pages {completed}/{len(jobs)}, SKUs {len(tools)}, errors {len(errors)}", flush=True)

    with BEAUTY_CSV.open(encoding="utf-8-sig", newline="") as handle:
        beauty_rows = [row for row in csv.DictReader(handle) if row.get("url_proveedor")]
    beauty = []
    with futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(beauty_product, row): row for row in beauty_rows}
        for completed, job in enumerate(futures.as_completed(jobs), 1):
            row = jobs[job]
            try:
                beauty.append(job.result())
            except Exception as exc:
                errors.append({"source": "beauty", "sku": row["sku_proveedor"], "error": str(exc)})
            if completed % 20 == 0 or completed == len(jobs):
                print(f"Beauty pages {completed}/{len(jobs)}, errors {len(errors)}", flush=True)

    result = {"checked_at": TODAY, "tools": tools, "beauty": beauty, "errors": errors}
    output = ROOT / f"supplier-prices-{TODAY}.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {output}: {len(tools)} tools, {len(beauty)} beauty, {len(errors)} errors", flush=True)


if __name__ == "__main__":
    main()

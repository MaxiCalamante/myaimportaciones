"""Read-only, bounded homepage/robots audit. No login, checkout, private APIs or bypasses."""
import concurrent.futures, datetime, json, pathlib, re, urllib.request

SOURCES = [
    ("star-company", "https://www.starcompany-py.com/"),
    ("vencell", "https://vencellalberdi.com/"),
    ("neo-import", "https://neoimport.net/"),
    ("madrid-center", "https://madridcenterimportados.com/home"),
    ("atacado-usa", "https://atacadousa.com.py/"),
    ("total", "https://www.totalherramientasoficial.com.py/"),
    ("atlantico", "https://www.atlanticoshop.com.py/"),
    ("atacado-connect", "https://atacadoconnect.com/"),
    ("mobile-zone", "https://www.mobilezone.com.py/"),
]

def request(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MYA-SupplierAudit/1.0 (read-only capability review)"})
        with urllib.request.urlopen(req, timeout=18) as response:
            content = response.read(3_000_001)
            if len(content) > 3_000_000:
                return {"url": url, "error": "size_limit"}, ""
            return {"url": url, "finalUrl": response.url, "status": response.status}, content.decode("utf-8", errors="replace")
    except Exception as exc:
        return {"url": url, "error": str(exc)[:250]}, ""

def audit(source):
    key, url = source
    result, html = request(url)
    robots, text = request(re.match(r"https://[^/]+", url)[0] + "/robots.txt")
    robots["validRobotsDocument"] = bool(re.search(r"^User-agent:", text, re.I | re.M))
    robots["rules"] = text[:12000] if robots["validRobotsDocument"] else ""
    title = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    result.update(key=key, checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), title=title.group(1).strip() if title else None,
                  signals={name: bool(re.search(pattern, html, re.I)) for name, pattern in {
                      "prestashop": "prestashop", "woocommerce": "woocommerce", "shopify": "cdn.shopify", "next": "__NEXT_DATA__|/_next/",
                      "jsonld": "application/ld\\+json", "search": "type=[\"']search|buscar|busca|search", "usd": "USD|U\\$|US\\$", "ars": "ARS", "pyg": "PYG|guaran[ií]",
                  }.items()}, robots=robots)
    return result

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        rows = list(executor.map(audit, SOURCES))
    destination = pathlib.Path("docs/suppliers/capabilities-2026-10-20.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    for row in rows:
        print(row["key"], row.get("status", row.get("error")), row["signals"], "robots", row["robots"].get("status", row["robots"].get("error")))

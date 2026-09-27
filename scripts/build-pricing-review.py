"""Product-by-product pricing evidence report. Read-only; never changes sale prices."""

import csv
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

import requests
from dotenv import dotenv_values

ROOT = Path("docs/pricing-review")
TODAY = date.today().isoformat()


def products_from_store():
    env = dotenv_values(".env.local")
    url, key = env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Falta la configuración de lectura del catálogo.")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    products = []
    for offset in range(0, 10000, 1000):
        response = requests.get(
            f"{url}/rest/v1/products",
            params={"select": "id,sku,title,slug,category_id,retail_price,wholesale_price,is_active,is_wholesale_only,source_url,fulfillment_mode,supplier_available", "order": "id.asc", "offset": offset, "limit": 1000},
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        page = response.json()
        products.extend(page)
        if len(page) < 1000:
            break
    categories_response = requests.get(
        f"{url}/rest/v1/categories", params={"select": "id,slug"}, headers=headers, timeout=30
    )
    categories_response.raise_for_status()
    excluded_categories = {
        item["id"] for item in categories_response.json()
        if re.search(r"smartphone|telefon|tecnologia|celular", item["slug"], re.I)
    }
    return products, excluded_categories


def money(value):
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def main():
    products, excluded_categories = products_from_store()
    with Path("docs/auditoria-precios.csv").open(encoding="utf-8-sig", newline="") as handle:
        old_by_sku = {row["sku"]: row for row in csv.DictReader(handle, delimiter=";") if row.get("sku")}
    sources_file = ROOT / f"supplier-prices-{TODAY}.json"
    sources = json.loads(sources_file.read_text(encoding="utf-8"))
    beauty = {row["sku"]: row for row in sources["beauty"]}
    tools = sources["tools"]
    with (ROOT / f"mercado-libre-muestra-{TODAY}.csv").open(encoding="utf-8-sig", newline="") as handle:
        comparisons = {row["sku"]: row for row in csv.DictReader(handle, delimiter=";")}
    rows = []
    statuses = Counter()
    for product in products:
        sku = product.get("sku") or ""
        source = tools.get(sku) or beauty.get(sku) or {}
        previous = old_by_sku.get(sku) or {}
        comparison = comparisons.get(sku) or {}
        base = money(previous.get("compra_pdf_ars"))
        retail = money(product.get("retail_price")) or 0
        ratio = retail / base if base and base > 0 else None
        target = round(base * 1.85 / 100) * 100 if base and base > 0 else None
        if not base or base <= 0:
            status = "SIN_COSTO_BASE_DOCUMENTADO"
        elif not source.get("price"):
            status = "SIN_PRECIO_PROVEEDOR_ACTUAL"
        elif ratio < 1.75:
            status = "DEBAJO_DE_1_75_COSTO_BASE"
        elif ratio > 1.95:
            status = "ENCIMA_DE_1_95_COSTO_BASE"
        else:
            status = "ENTRE_1_75_Y_1_95_COSTO_BASE"
        statuses[status] += 1
        visible = (
            not product.get("is_wholesale_only")
            and product.get("category_id") not in excluded_categories
            and not re.search(r"iphone|smartphone|celular", product["title"], re.I)
        )
        rows.append({
            "id": product["id"], "sku": sku, "producto": product["title"], "activo": product["is_active"],
            "solo_mayorista": product.get("is_wholesale_only", False), "visible_catalogo_minorista": visible,
            "precio_actual_ars": retail, "costo_base_pdf_ars_2026_09_21": base if base is not None else "",
            "venta_sobre_base": round(ratio, 3) if ratio else "", "referencia_1_85_sobre_base_ars": target or "",
            "brecha_a_referencia_ars": round(target - retail) if target else "", "precio_proveedor_actual": source.get("price", ""),
            "moneda_proveedor": source.get("currency", ""), "url_proveedor": source.get("url") or product.get("source_url") or "",
            "fecha_revision_proveedor": source.get("checked_at", ""),
            "precio_ML_comparable_ars": comparison.get("precio_ml_ars", ""), "url_ML": comparison.get("url_ml", ""),
            "comparacion_ML": comparison.get("resultado", ""), "observacion_ML": comparison.get("observacion", ""),
            "costo_puesto_confirmado": "NO", "comparacion_ML_confirmada": "SI" if comparison.get("resultado") == "COMPARABLE_VERIFICADO" else "NO",
            "estado_revision": status,
        })

    output = ROOT / f"productos-{TODAY}.csv"
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    summary = {
        "fecha": TODAY, "productos": len(rows), "activos": sum(bool(row["activo"]) for row in rows),
        "con_sku": sum(bool(row["sku"]) for row in rows),
        "catalogo_minorista": sum(bool(row["visible_catalogo_minorista"]) for row in rows),
        "proveedor_actual": sum(bool(row["precio_proveedor_actual"]) for row in rows),
        "sin_precio_proveedor_actual": sum(not bool(row["precio_proveedor_actual"]) for row in rows),
        "costo_base_pdf": sum(bool(row["costo_base_pdf_ars_2026_09_21"]) for row in rows),
        "comparables_ML_verificados": sum(row["comparacion_ML_confirmada"] == "SI" for row in rows),
        "estados": dict(statuses),
        "nota": "Referencia de 1,85 veces el costo base histórico. No incluye flete, impuestos ni gastos; no es precio aprobado ni competitivo verificado.",
    }
    (ROOT / f"resumen-{TODAY}.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Guardado: {output}")


if __name__ == "__main__":
    main()

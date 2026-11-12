"""Export a private, complete SQL audit snapshot; never reads or writes production."""
import csv
import json
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

source, destination = map(Path, sys.argv[1:3])
data = json.loads(source.read_text())
items, summary = data['items'], data['summary']
products = [r for r in items if r['variant_id'] is None]
variants = [r for r in items if r['variant_id'] is not None]
for rows, label in ((products, 'products'), (variants, 'variants')):
    identities = {(r['product_id'], r['variant_id']) for r in rows}
    assert len(identities) == len(rows) == summary[label]['total'], 'Incomplete or duplicate audit coverage'
    assert all(r['status'] in ('corrected', 'unchanged', 'pending', 'archived') for r in rows)
    assert sum(summary[label][k] for k in ('corrected', 'unchanged', 'pending', 'archived')) == len(rows)
destination.mkdir(parents=True, exist_ok=True)

def difference(a, b):
    return Decimal(str(a)) - Decimal(str(b)) if a is not None and b is not None else None

def row(item):
    before = item['before_state']
    after = item.get('after_state') or before
    product = before['product']
    variant = before.get('variant') or {}
    old = before.get('usd') or {}
    new = after.get('usd') or old
    profile = after.get('profile') or before.get('profile') or {}
    basis = profile.get('basis') or {}
    offer = next((o for o in after.get('offers', before.get('offers', [])) if o['id'] == profile.get('source_offer_id')), {})
    old_basis = (before.get('profile') or {}).get('basis') or {}
    snapshot = new.get('profitability_snapshot') or {}
    results = snapshot.get('results') or {}
    retail_result = results.get('retail:transferencia') or results.get('retail:mercado_pago') or {}
    wholesale_result = results.get('wholesale:transferencia') or results.get('wholesale:mercado_pago') or {}
    legacy = (before.get('productCosts') or {}) if item['variant_id'] is None else {}
    verified = item['status'] in ('corrected', 'unchanged') and item.get('eligible')
    return {
        'run_id': item['run_id'], 'baseline_run_id': item.get('baseline_run_id'), 'sql_status': item.get('sql_status', item['status']), 'product_id': item['product_id'], 'variant_id': item['variant_id'],
        'sku': variant.get('sku') if item['variant_id'] else product.get('sku'),
        'title': product['title'], 'variant': variant.get('title'), 'category_id': product.get('category_id'),
        'suppliers_recorded': ' | '.join(sorted({s['name'] for s in before.get('suppliers', [])})),
        'source_url': offer.get('source_url') or (product.get('source_url') if not item['variant_id'] else None),
        'currency_recorded': old_basis.get('currency') or legacy.get('currency'),
        'origin_cost_recorded': old_basis.get('origin', legacy.get('origin_cost')),
        'origin_cost_verified': offer.get('origin_cost') if verified else None,
        'supplier_checked_at': offer.get('cost_checked_at'), 'supplier_availability': offer.get('availability'),
        'carrier_rule': json.dumps(basis.get('carrier'), ensure_ascii=False),
        'other_documented_costs': json.dumps(basis.get('components'), ensure_ascii=False),
        'total_cost_usd_before': old.get('total_cost_usd'), 'total_cost_usd_after': new.get('total_cost_usd'),
        'retail_ars_after_verified': retail_result.get('effectivePaidArs') if verified else None,
        'wholesale_ars_after_verified': wholesale_result.get('effectivePaidArs') if verified and new.get('wholesale_usd') is not None else None,
        'public_usdt_ars_at_audit': summary.get('public_usdt_ars_at_audit'),
        'retail_sale_fee_usd': retail_result.get('feesUsd') if verified else None,
        'retail_usd_before': old.get('retail_usd'), 'retail_usd_after': new.get('retail_usd'),
        'wholesale_usd_before': old.get('wholesale_usd'), 'wholesale_usd_after': new.get('wholesale_usd'),
        'retail_usd_difference': difference(new.get('retail_usd'), old.get('retail_usd')),
        'retail_ars_legacy': (variant or product).get('retail_price'),
        'wholesale_ars_legacy': (variant or product).get('wholesale_price'),
        'minimum_usd_recorded': new.get('minimum_commercial_usd'),
        'retail_margin_recorded': new.get('effective_retail_margin'),
        'wholesale_margin_recorded': new.get('effective_wholesale_margin'),
        'retail_source': new.get('retail_source'), 'wholesale_source': new.get('wholesale_source'),
        'active_before': product.get('is_active'), 'deleted_at_before': product.get('deleted_at'),
        'status': item['status'], 'eligible': bool(item.get('eligible')), 'applied_at': item.get('applied_at'),
        'reason': item.get('reason'), 'audit_item_id': item['id'],
    }

def cell(value):
    if isinstance(value, str) and value[:1] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + value
    return value

for records, filename in ((products, 'catalogo-auditado.csv'), (variants, 'variantes-auditadas.csv')):
    exported = [row(item) for item in records]
    if not exported:
        continue
    with (destination / filename).open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(exported[0]))
        writer.writeheader()
        writer.writerows({k: cell(v) for k, v in record.items()} for record in exported)
(destination / 'resumen.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps({'products': len(products), 'variants': len(variants), 'output': str(destination)}))

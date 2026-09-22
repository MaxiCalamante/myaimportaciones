"""Prepare reviewable cost imports from the locally extracted supplier PDF. No network writes."""
import csv, json, pathlib, re

root = pathlib.Path(__file__).resolve().parents[1]
folder = root / 'docs/catalog-audit'
products = json.loads((folder / 'products-before.json').read_text(encoding='utf-8'))
costs = json.loads((folder / 'pdf-costs.json').read_text(encoding='utf-8'))
by_sku = {}
for cost in costs:
    sku = str(cost['sku'])
    if sku in by_sku and by_sku[sku]['cost_ars'] != cost['cost_ars']:
        raise ValueError(f'Conflicting PDF prices for {sku}')
    by_sku[sku] = cost
matched, report = [], []
for p in products:
    image_match = re.fullmatch(r'/products/tools/(\d+)\.jpg', p['image_url'] or '')
    sku = image_match.group(1) if image_match else p.get('sku')
    c = by_sku.get(sku)
    sale = float(p['retail_price'] or 0)
    if c:
        matched.append((p['id'], sku, c['cost_ars'], c['page']))
    report.append({'producto': p['title'], 'sku': sku or '', 'venta_ars': sale,
      'compra_pdf_ars': c['cost_ars'] if c else '',
      'diferencia_antes_de_gastos_ars': round(sale-c['cost_ars'],2) if c else '',
      'margen_antes_de_gastos_pct': round((sale-c['cost_ars'])/sale*100,2) if c and sale else '',
      'pagina_pdf': c['page'] if c else '',
      'estado': 'Costo base documentado; transporte y comisiones pendientes' if c else 'Sin costo de compra documentado en este PDF',
      'mercado_libre': 'Comparación individual pendiente'})
with (root / 'docs/auditoria-precios.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(report[0]),delimiter=';'); writer.writeheader(); writer.writerows(report)
for offset in range(0,len(matched),400):
    rows=matched[offset:offset+400]
    values=','.join(f"('{pid}'::uuid,'{sku}',{cost},{page})" for pid,sku,cost,page in rows)
    sql=f"""with source(id,sku,cost,page) as (values {values}), imported as (
insert into public.product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,other_landed_cost,variable_cost,payment_fee_percent,minimum_contribution,expenses_confirmed,source_document,source_page)
select p.id,s.cost,'ARS',1,0,0,0,0,0,false,'Catalogo_MyA_Importaciones_MAYORISTA_2026.pdf',s.page
from source s join public.products p on p.id=s.id
where p.image_url='/products/tools/'||s.sku||'.jpg' or p.sku=s.sku
on conflict(product_id) do nothing returning product_id)
select count(*) as imported from imported;"""
    (folder / f'cost-import-{offset//400}.sql').write_text(sql,encoding='utf-8')
print(json.dumps({'matched':len(matched),'missing':len(products)-len(matched),'below_base':sum(1 for r in report if r['compra_pdf_ars'] and r['venta_ars']<=r['compra_pdf_ars'])}))

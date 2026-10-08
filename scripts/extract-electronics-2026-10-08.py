import json
from pathlib import Path
import openpyxl
out=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
out.mkdir(exist_ok=True)
rows=[]
for name in ['IPHONE ATACADO USA 08-10.xlsx','SAMSUNG ATACADO USA 08-10.xlsx']:
    path=Path('C:/Users/maxim/OneDrive/Escritorio')/name
    for s in openpyxl.load_workbook(path,data_only=True).worksheets:
        for i,r in enumerate(s.iter_rows(values_only=True),1):
            if i>=3 and r[0] and isinstance(r[2],(float,int)):
                rows.append(dict(file=name,row=i,sku=str(r[0]),raw=r[1],purchase_usd=r[2]))
(out/'source.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(products=len(rows),unique=len(set(r['sku'] for r in rows)))))

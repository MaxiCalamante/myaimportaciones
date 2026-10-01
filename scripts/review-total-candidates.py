"""Review exact candidate variants in the supplier's Paraguay storefront (IVA included)."""
import json,re,sys,threading,time
from pathlib import Path
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parents[1]/'docs/tools-selection-2026-10-01'
BASE='https://www.totalherramientasoficial.com.py'
PAIRS=[
 ('Taladros atornilladores','553278','527330'),
 ('Taladros percutores eléctricos','444460','41614'),
 ('Taladros percutores a batería','527354','518635'),
 ('Atornilladores de impacto','436182','501859'),
 ('Llaves de impacto a batería','60790','609333'),
 ('Amoladoras compactas','461801','158237'),
 ('Amoladoras industriales','436281','367400'),
 ('Amoladoras a batería','54515','564854'),
 ('Rotomartillos eléctricos','463836','455305'),
 ('Rotomartillos a batería','286794','207546'),
 ('Sierras caladoras','461825','102933'),
 ('Sierras circulares a batería','415033','232111'),
 ('Sierras sable','615174','495585'),
 ('Lijadoras de palma a batería','512558','251136'),
 ('Fresadoras','381086','415873'),
 ('Pistolas de pintura','53150','350914'),
 ('Hidrolavadoras','560702','381352'),
 ('Infladores de neumáticos','381178','529259'),
 ('Aspiradoras húmedo/seco','110969','225809'),
 ('Sopladores eléctricos','471176','350945'),
 ('Soldadoras inverter','521147','502061'),
 ('Niveles láser','521390','288576'),
 ('Medidores láser','595384','595988'),
 ('Multímetros digitales','521222','526180'),
 ('Juegos de herramientas manuales','456340','595360'),
 ('Juegos de alicates','415347','502207'),
 ('Juegos de llaves de carraca','609746','609760'),
 ('Juegos de tubos de impacto','609876','609685'),
 ('Kits de herramientas con taladro','33367','583916'),
 ('Juegos de destornilladores y puntas','436717','531696'),
]
index={r['sku']:r for r in json.loads((OUT/'listings.json').read_text(encoding='utf-8'))}
# Extra alternatives are reviewed before committing to a particular presentation.
extra=['531559','350884','341318','350877','239707','381345','526067','381352','487443','487450','488150','553292','576642','576659','512268','303323','527705','609623','529396','529402','437240','201803','512558','251136','527583','528122','350952','532068','465434','350846','415033','232111','527651','531726','158237']
wanted=sorted({sku for _,a,b in PAIRS for sku in [a,b] if sku!='0'}|set(extra))
local=threading.local()
def session():
 if not hasattr(local,'session'):
  local.session=requests.Session();local.session.get(BASE+'//set-country/py',timeout=30).raise_for_status()
 return local.session
def fetch(sku):
 row=index[sku];file=OUT/f'detail-{sku}.html'
 if file.exists():text=file.read_text(encoding='utf-8')
 else:
  r=session().get(row['url'],timeout=35);r.raise_for_status();r.encoding='utf-8';text=r.text;file.write_text(text,encoding='utf-8')
 s=BeautifulSoup(text,'html.parser');title=s.h1.get_text(' ',strip=True)
 price=s.select_one('.product-price');price_text=price.get_text(' ',strip=True) if price else ''
 m=re.search(r'USD\s*([\d.,]+)',price_text)
 usd=float(m[1].replace('.','').replace(',','.')) if m and ',' in m[1] else float(m[1]) if m else None
 description=s.select_one('#product-tab-description')
 lines=list(dict.fromkeys(x.strip() for x in description.get_text('\n',strip=True).splitlines() if x.strip())) if description else []
 pid=row['supplier_product_id']
 images=list(dict.fromkeys(a for a in re.findall(r'(?:src|href|data-zoom-image)="([^"]+/img/'+pid+r'/produtos/1500/[^"]+)"',text)))
 result=dict(row,title=title,usd=usd,price_text=price_text,price_includes_iva='CON I.V.A' in price_text,description_lines=lines,images=images,checked_at=datetime.now(timezone.utc).isoformat())
 return result
done={};errors=[]
with ThreadPoolExecutor(max_workers=6) as pool:
 jobs={pool.submit(fetch,k):k for k in wanted if k in index}
 for i,f in enumerate(as_completed(jobs),1):
  try:r=f.result();done[r['sku']]=r
  except Exception as e:errors.append(dict(sku=jobs[f],error=str(e)))
  if i%20==0:print(f'Detalles Paraguay {i}/{len(jobs)}',flush=True)
(OUT/'candidate-details.json').write_text(json.dumps(done,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'pairs-proposed.json').write_text(json.dumps(PAIRS,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(reviewed=len(done),missing=[k for k in wanted if k not in index],errors=errors),ensure_ascii=False))

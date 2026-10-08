import re,json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
for key in ['imac','macmini','macair','macpro','macneo','iphone16','iphone18']:
 h=(OUT/('official-'+key+'.html')).read_text(encoding='utf8')
 names=sorted(set(re.findall(r'(?:mba\d+|mbp\d+|imac|mac-mini|macbook-neo|iphone-16|iphone-18)[A-Za-z0-9_-]+',h)))
 print(key,[x for x in names if any(y in x for y in ['silver','green','blue','black','starlight','pink','citrus']) and ('select' in x or 'hero' in x)][:80])

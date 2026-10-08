import json,re
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
for key in ['a16','a17','s26plus','iphone16','imac']:
 h=(OUT/f'official-{key}.html').read_text(encoding='utf8')
 s=BeautifulSoup(h,'html.parser')
 print(key)
 if key in ['a16','a17','s26plus']:
  urls=list(dict.fromkeys(re.findall(r'(?:(?:https:)?//images\.samsung\.com/is/image/samsung/p6pim/)[^\s"<>\\]+',h)))
  print([u.split('?')[0] for u in urls if '/gallery/' in u][:12])
  print([(a.get('href'),a.get_text(' ',strip=True)[:40]) for a in s.select('a[href]') if re.search(r'(sm-a165|sm-a175|sm-s947)',a['href'])][:15])
 else:
  urls=list(dict.fromkeys(re.findall(r'https://store.storeimages.cdn-apple.com[^\s"<>\\]+',h)))
  print([urlsplit(u).path.split('/')[-1] for u in urls if any(k in u.lower() for k in ['teal','ultramarine','black','white','blue','green','silver'])][:25])

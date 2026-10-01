"""Contact sheets for human inspection of the complete cosmetics image/title mapping."""
import json,textwrap,io,requests
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path(__file__).resolve().parents[1]/'docs/cosmetics-completion-2026-10-01'
products=json.loads((out/'before.json').read_text(encoding='utf8'))['products']
previous=out.parent/'supplier-import-2026-10-01/media'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
for start in range(0,len(products),24):
 sheet=Image.new('RGB',(1440,1040),'white');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(products[start:start+24]):
  name=p['image_url'].rsplit('/',1)[1];local=previous/name
  im=Image.open(local) if local.exists() else Image.open(io.BytesIO(requests.get(p['image_url'],timeout=40).content))
  im=im.convert('RGB');im.thumbnail((220,190));x=(i%6)*240;y=(i//6)*260
  sheet.paste(im,(x+(240-im.width)//2,y))
  label=p['sku']+' '+p['title']+(' [BORRADOR]' if not p['is_active'] else '')
  draw.text((x+5,y+192),'\n'.join(textwrap.wrap(label,32)),font=font,fill='black')
 sheet.save(out/f'contact-{start//24+1}.jpg')
print('Contact sheets ready')

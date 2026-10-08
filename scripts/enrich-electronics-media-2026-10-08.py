import json,re,requests,hashlib,concurrent.futures,io
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
OUT=Path(__file__).resolve().parents[1]/'docs/electronics-atacado-2026-10-08'
rows=json.loads((OUT/'normalized.json').read_text(encoding='utf8'))
market=json.loads((OUT/'market-tecnoselect.json').read_text(encoding='utf8'))
official={x['key']:x for name in ['official-media.json','extra-media.json','more-media.json'] for x in json.loads((OUT/name).read_text(encoding='utf8'))}
def clean(u):return ('https:'+u if u.startswith('//') else u).replace('&amp;','&')
def gallery(key):
 x=official[key];h=next((f.read_text(encoding='utf8') for f in [OUT/('official-'+key+'.html'),OUT/('extra-'+key+'.html'),OUT/('more-'+key+'.html')] if f.exists()),'')
 urls=list(dict.fromkeys(re.findall(r'https?://images\.samsung\.com/is/image/samsung/[^\s"<>?]+/gallery/[^\s"<>?]+',h)))
 # These assets have been observed on the exact model and color's official page.
 full=[u for u in urls if '-thumb-' not in u]
 return [(u+'?wid=1200&fmt=png-alpha') for u in (full or urls)][:4]
def feature(key,word):
 return list(dict.fromkeys(clean(i['url']).split('?')[0]+'?wid=1200&fmt=png-alpha' for i in official[key]['images'] if word in i['url'] and 'feature' in i['url']))[:1]
manual={
 ('iPhone 13 Pro','graphite'):['https://brain-images-ssl.cdn.dixons.com/0/0/10230600/l_10230600.jpg'],
 ('iPhone 14 Pro Max','spaceblack'):['https://img.globaldata.pt/products/MQ9U3QL-A.jpg'],
 ('iPhone 15','black'):['https://www.hallon.se/cms/media/wpdlp1uc/01_iphone15_black_backfront.jpg'],
 ('iPhone 15','green'):['https://www.phonesonline.ie/cdn/shop/files/iphone-15-green_1024x1024%402x.jpg?v=1710516605'],
 ('iPhone 15 Pro','blacktitanium'):['https://alephksa.com/cdn/shop/files/iPhone_15_Pro_Black_Titanium_PDP_Image_Position-1__en-ME.jpg?v=1694758188&width=2048'],
 ('iPhone 15 Pro Max','natural'):['https://inspireonline.in/cdn/shop/files/iPhone_15_Pro_Max_Natural_Titanium_PDP_Image_Position-1__en-IN_579f81d6-76fb-499c-acd8-5291290f4b22.jpg?v=1694758946&width=1920'],
 ('iMac Intel 21,5″','silver'):['https://pisces.bbystatic.com/image2/BestBuy_US/images/products/5721/5721900_sd.jpg'],
}
samsung={
 ('Galaxy A07','black'):'a07blacknz',('Galaxy A07','green'):'a07',
 ('Galaxy A16','black'):'a16',('Galaxy A16','gray'):'a16gray',('Galaxy A16','green'):'a16green',
 ('Galaxy A17','black'):'a17blackuk',('Galaxy A17','blue'):'a17blueuk',('Galaxy A17','gray'):'a17grayuk',
 ('Galaxy Tab A11','gray'):'taba11gray',('Galaxy Tab A11','silver'):'taba11silver',
 ('Galaxy Tab A11+','gray'):'taba11plusgray',('Galaxy Tab A11+','silver'):'taba11plussilver',
 ('Galaxy Tab S10 Lite','gray'):'tabs10',
}
print('Official keys',list(official))
for r in rows:
 f,c=r['family'],r['color_key'];key=(f,c)
 if key in manual:r['image_candidates']=manual[key];r['photo_evidence']='Primary retailer model/color product image; representative for CPO condition.'
 elif key in samsung:
  k=samsung[key]
  # Lookup case-insensitively because research keys retain IE country capitalization.
  k=next((a for a in official if a.lower()==k.lower()),k)
  if f=='Galaxy Tab S10 Lite' and r['part']=='SM-X406B':k='tabs10cell'
  k=next((a for a in official if a.lower()==k.lower()),k)
  r['image_candidates']=gallery(k);r['photo_evidence']=official[k]['url']
 elif f in ['Galaxy A37','Galaxy A57']:
  k='a37' if f.endswith('37') else 'a57';word={'charcoal':'charcole','icyblue':'icyblue'}.get(c,c)
  r['image_candidates']=feature(k,'awesome-'+word);r['photo_evidence']=official[k]['url']
 elif f=='Galaxy A27':
  word={'black':'awesome-black','blue':'awesome-blue','pink':'awesome-pink'}.get(c,c)
  # Every color asset is described on Samsung's A27 page.
  candidates=[i for i in official['a27']['images'] if 'feature' in i['url'] and c in i['alt'].lower() and ('back' in i['alt'].lower() or 'rear' in i['alt'].lower())]
  r['image_candidates']=list(dict.fromkeys(clean(i['url']).split('?')[0]+'?wid=1200&fmt=png-alpha' for i in candidates))[:2];r['photo_evidence']=official['a27']['url']
 elif f=='Galaxy S26+':
  r['image_candidates']=list(dict.fromkeys(clean(i['url']).split('?')[0] for i in official['s26spec']['images'] if 'plus in Sky Blue' in i['alt']))[:1];r['photo_evidence']=official['s26spec']['url']
 elif f=='iPhone 16e':
  r['image_candidates']=list(dict.fromkeys(clean(i['url']) for i in official['iphone16ewhite']['images'] if 'iPhone_16e_White_PDP' in i['alt']))[:4];r['photo_evidence']=official['iphone16ewhite']['url']
 elif f=='iPhone 16':
  x=official['iphone16'];urls=x.get('embedded',[])+[i['url'] for i in x['images']]
  r['image_candidates']=list(dict.fromkeys(clean(u) for u in urls if f'iphone-16-{c}-select-' in u and 'witb' not in u.lower()))[:3];r['photo_evidence']=x['url']
 elif not r['image_candidates']:
  # Hardware-identical housing/color may share imagery across storage/SIM variants.
  same=[x for x in rows if x['family']==f and x['color_key']==c and x['image_candidates']]
  if same:r['image_candidates']=same[0]['image_candidates'];r['photo_evidence']='Identical model housing and color, storage/SIM are specified separately.'
  elif f=='iMac M4 24″' and c=='green':r['image_candidates']=next(m['images'] for m in market if m['sku']=='MWV03LL/A')[:4]
  elif f=='MacBook Neo' and c=='citrus':r['image_candidates']=next(m['images'] for m in market if m['sku']=='MHFE4LL/A')[:1];r['photo_evidence']='MacBook Neo Citrus housing; UK keyboard version specified separately.'
 if not r.get('photo_evidence') and r['image_candidates']:r['photo_evidence']=(r.get('reference') or {}).get('url','Same model and color primary manufacturer imagery')
 # Manufacturer catalog assets avoid retailer watermarks and mixed-color covers.
 if r['brand']=='Apple' and key not in manual and f!='iPhone 16e':
  asset=None
  if f=='iPhone 16':asset=f'iphone-16-{c}-select-202409';k='iphone16'
  elif f=='iPhone 17':asset=f'iphone-17-finish-select-{c}-202509_GEO_US';k='iphone17'
  elif f=='iPhone 17e':asset=f'iphone-17e-finish-select-{c}-202603';k='iphone17e'
  elif f.startswith('iPhone 18'):asset=f'iphone-18-pro'+('-max' if 'Max' in f else '')+f'-finish-select-{c}-202609';k='iphone18'
  elif f.startswith('iPhone 17 Pro'):asset='iphone-17-pro'+('-max' if 'Max' in f else '')+f'-finish-select-{c}-202509';k='iphone17pro'
  elif f.startswith('iPad A16'):asset=f'ipad-2022-hero-{c}-wifi-select';k='ipada16'
  elif f.startswith('iPad Air'):asset=f'ipad-air-select-11in-wifi-{c}-202405';k='ipadair'
  elif f.startswith('iPad Pro'):asset=f'ipad-pro-11-select-wifi-{c}-202405';k='ipadpro'
  elif f=='iMac M4 24″':asset=f'imac-touch-id-{c}-selection-hero-202410_SW_COLOR';k='imac'
  elif f=='Mac mini M4':asset='mac-mini-202410-gallery-1';k='macmini'
  elif f.startswith('MacBook Air'):asset=f'mba'+('15' if '15,' in r['specifications']['Pantalla'] else '13')+f'-{c}-select-202503_SW_COLOR';k='macair'
  elif f.startswith('MacBook Pro'):asset='mbp'+('16' if '16,' in r['specifications']['Pantalla'] else '14')+f'-'+('spaceblack' if c in ['black','spaceblack'] else 'silver')+'-cto-hero-202410_SW_COLOR';k='macpro'
  elif f=='MacBook Neo':asset=f'macbook-neo-{c}-cto-hero-202603_SW_COLOR';k='macneo'
  if asset:
   asset=asset.replace('_SW_COLOR','')
   r['image_candidates']=[f'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/{asset}?wid=1200&hei=1200&fmt=jpeg&qlt=90']
   r['photo_evidence']=official[k]['url']+' ; Apple CDN product/color catalog asset, decoded and visually checked.'
all_urls=sorted(set(clean(u) for r in rows for u in r['image_candidates']))
(OUT/'images').mkdir(exist_ok=True)
def download(u):
 key=hashlib.sha256(u.encode()).hexdigest()[:20];f=OUT/'images'/(key+'.jpg')
 try:
  if not f.exists():
   response=requests.get(u,headers={'User-Agent':'Mozilla/5.0'},timeout=45);response.raise_for_status()
   im=Image.open(io.BytesIO(response.content));im.load()
   if im.width<150 or im.height<150:raise ValueError('Image too small')
   canvas=Image.new('RGB',im.size,'white');canvas.paste(im.convert('RGBA'),mask=im.convert('RGBA').getchannel('A'));canvas.thumbnail((1400,1400));canvas.save(f,quality=90,optimize=True)
  im=Image.open(f);return dict(url=u,file=str(f.resolve()),width=im.width,height=im.height,bytes=f.stat().st_size)
 except Exception as e:return dict(url=u,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:assets=list(pool.map(download,all_urls))
byurl={a['url']:a for a in assets}
for r in rows:r['images']=[byurl[clean(u)] for u in r['image_candidates'] if not byurl[clean(u)].get('error')]
(OUT/'enriched.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2),encoding='utf8')
unique={}
for r in rows:
 if r['images']:unique.setdefault((r['family'],r['color_key']),r)
items=list(unique.values())
for offset in range(0,len(items),24):
 sheet=Image.new('RGB',(1200,((min(len(items)-offset,24)+5)//6)*240),'white');draw=ImageDraw.Draw(sheet)
 for n,r in enumerate(items[offset:offset+24]):
  x=(n%6)*200;y=(n//6)*240;im=Image.open(r['images'][0]['file']);im.thumbnail((180,185));sheet.paste(im,(x+(200-im.width)//2,y+(190-im.height)//2));draw.text((x+6,y+195),r['family'],fill='black');draw.text((x+6,y+215),r['color_key'],fill='black')
 sheet.save(OUT/f'contact-{offset//24+1}.jpg')
print(json.dumps(dict(products=len(rows),with_images=sum(bool(r['images']) for r in rows),missing=[(r['sku'],r['family'],r['color_key']) for r in rows if not r['images']],errors=[a for a in assets if a.get('error')]),ensure_ascii=False))

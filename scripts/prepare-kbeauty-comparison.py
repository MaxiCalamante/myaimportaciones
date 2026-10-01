"""Reviewed supplier equivalences: same line, presentation and variant only."""
import json, re, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/supplier-import-2026-10-01'
rows=json.loads((OUT/'offers.json').read_text(encoding='utf-8'))
# Index pairs refer to the frozen offers.json snapshot from this collection.
PAIRS={1:179,2:183,3:187,4:186,5:196,7:177,8:205,12:111,13:136,
14:112,15:107,18:139,19:105,24:169,25:151,26:127,27:150,32:161,
34:148,35:104,38:147,39:166,40:121,43:158,44:137,45:110,46:153,
48:117,50:132,52:130,53:203,54:176,55:141,56:175,58:145,59:128,
63:162,64:194,65:188,67:134,68:116,69:114,71:119,72:156,73:108,
61:122,74:115,75:129,76:160,77:109,78:118,81:101,82:102,83:138,84:152,
85:154,88:174,89:181,91:180,92:199,93:106,94:103,96:133,97:146,99:120}

def clean(t):
    t=re.sub(r'\s*\([^)]*\)?/?',' ',t)
    t=re.sub(r'\s+\d{4,}\s*$','',t)
    t=t.replace('SKIN 1004','SKIN1004').replace('SRPAY','SPRAY').replace('BRIGHETING','BRIGHTENING')
    t=t.replace('MADAG. CENT.', 'MADAGASCAR CENTELLA').replace('MADAG. CENTELLA','MADAGASCAR CENTELLA').replace('MADAG CENT','MADAGASCAR CENTELLA').replace('MADAGASC CENTELLA','MADAGASCAR CENTELLA')
    for old,new in [('CREME FACIAL','Crema facial'),('CREME PARA CONTORNO DE OLHOS','Contorno de ojos'),('SERUM FACIAL','Sérum facial'),('TONICO FACIAL','Tónico facial'),('MASCARA FACIAL','Mascarilla facial'),('MASCARA','Mascarilla'),('PROTETOR SOLAR','Protector solar'),('LIMPADOR FACIAL','Limpiador facial'),('CONDICIONADOR','Acondicionador')]: t=t.replace(old,new)
    t=re.sub(r'\s+',' ',t).strip(' /(').title()
    for a in ['PDRN','TXA','NMN','EGF','NAD','BHA','UV','SPF','BB','A-T','AGE-R','SKIN1004']:
        t=re.sub(r'\b'+re.escape(a)+r'\b',a,t,flags=re.I)
    t=re.sub(r'(\d)\s*(Ml|Gr|G)\b',lambda m:m[1]+' '+('ml' if m[2]=='Ml' else 'g'),t)
    return t

OVERRIDES={2:'SKIN1004 Madagascar Centella Hyalu-Cica Moisture Cream 75 ml',
53:'SKIN1004 Madagascar Centella Hyalu-Cica Travel Kit - 4 productos',
8:'SKIN1004 Madagascar Centella Tea-Trica Travel Kit - 4 productos',
89:'SKIN1004 Madagascar Centella Travel Kit - 5 productos',
19:'Medicube Triple Collagen Toner 4.0 140 ml',35:'Medicube Triple Collagen Serum 4.0 55 ml',
76:'Medicube Triple Collagen Cream 4.0 50 ml',
61:'Medicube PDRN Pink Collagen Toning Gel Toner 70 pads - 120 ml',
98:'Medicube Deep Vita C Ampoule 14.5% - Pack de 3 x 10 g',
14:'Medicube Deep Vita C Daily Quick Mask - 30 mascarillas / 350 g',
15:'Medicube Zero Pore Pad Mild - 70 pads / 155 g',
17:'Medicube AGE-R Sanitizing Wipes - 30 toallitas',
18:'Medicube PDRN Pink Peptide Serum Mask - 1 mascarilla / 23 ml',
22:'Medicube Zero Pore Cooling Mask - 1 mascarilla / 27 g',
28:'Medicube PDRN Collagen Gua Sha Neck Wrinkle Cream 5% Volufiline 90 g',
38:'Medicube Azelaic Acid 16 BB Calming Serum 30 ml',
41:'Medicube PDRN Pink Vita Coating Mask - 10 mascarillas de 22 g',
49:'Medicube Deep Vita C Glutathione Brightening Mask - 1 mascarilla / 27 ml',
50:'Medicube PDRN Hydrating UV Serum SPF50+ PA++++ 50 ml',
55:'Medicube PDRN Pink Peptide Serum Mask - 6 mascarillas de 23 ml',
56:'SKIN1004 Madagascar Centella Ampoule 100 ml',
57:'SKIN1004 Madagascar Centella Poremizing Fresh Ampoule 100 ml',
60:'Medicube Deep Peptide Radiance Mask - 1 mascarilla',
66:'Medicube Zero Pore Pad 2.0 - 70 pads / 155 g',
69:'Medicube TXA Niacinamide 15% Serum 30 ml',
75:'Medicube AGE-R Glutathione Glow Capsule Cream 50 ml',
80:'Medicube Kojic Acid Turmeric Pad - 70 pads / 160 ml',
83:'Medicube Collagen Lifting Mask - 1 mascarilla / 27 g',
84:'Medicube Red Succinic Acid Peeling Pad - 70 pads / 155 g',
85:'Medicube Kojic Acid Turmeric Toning Cleanser 120 g',
88:'SKIN1004 Madagascar Centella Ampoule 55 ml',
93:'Medicube Deep Vita C Pad - 70 pads / 150 g',
95:'Medicube PDRN Pink Collagen Gel Mask - 4 mascarillas de 28 g',
124:'Medicube Kojic Acid Turmeric Niacinamide Serum 30 ml',
125:'Medicube Kojic Acid Turmeric Night Wrapping Mask 75 ml',
140:'Medicube Zero Pore Peel Pad - 8 pads',
142:'Medicube Azelaic Acid 16 BB Calming Serum Mask - 1 mascarilla',
159:'Medicube Kojic Acid Turmeric Vita Eye Gel Serum 30 ml',
165:'Medicube Zero Foam Cleanser 120 g',
171:'Medicube PDRN Mild Cleansing Oil 195 ml',
172:'Medicube Kojic Acid Turmeric Vita Capsule Cleansing Foam 120 g',
173:'SKIN1004 Madagascar Centella Watergel Sheet Ampoule Mask - 1 mascarilla / 25 ml',
204:'SKIN1004 Madagascar Centella Poremizing Travel Kit - 4 productos',
180:'SKIN1004 Madagascar Centella Tone Brightening Cleansing Gel Foam 125 ml'}

products=[]; consumed=set(PAIRS.values())
for i,r in enumerate(rows):
    if i in consumed: continue
    offers=[r]+([rows[PAIRS[i]]] if i in PAIRS else [])
    assert all(o['brand']==r['brand'] for o in offers)
    chosen=min(offers,key=lambda o:(o['price'] if o['price'] else float('inf'),-o['quantity']))
    identity=offers[0]['url']
    title=OVERRIDES.get(i,clean(r['title']))
    product={'key':i,'id':str(uuid.uuid5(uuid.NAMESPACE_URL,'mya-kbeauty:'+identity)),
        'title':title,'brand':r['brand'],'offers':offers,'selected':chosen,
        'largest_stock':max(offers,key=lambda o:o['quantity']),
        'query': 'site:mercadolibre.com.ar '+title}
    products.append(product)
(OUT/'comparison.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'queries.json').write_text(json.dumps([{'key':p['key'],'q':p['query']} for p in products],ensure_ascii=False),encoding='utf-8')
print('Unique products',len(products),'Shared',len(PAIRS),'Brands', {b:sum(p['brand']==b for p in products) for b in ['Medicube','SKIN1004']})

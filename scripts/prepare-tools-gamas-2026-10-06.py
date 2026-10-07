"""Prepare three distinct screwdriver tiers from verified, available products."""
import json, sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf8')
out = Path(__file__).resolve().parents[1] / 'docs/tools-additions-2026-10-06'
before = json.loads((out/'after.json').read_text(encoding='utf8'))
supplier = json.loads((out/'candidates.json').read_text(encoding='utf8'))
changes = []
for model, tier in [('TSDLI08025','Baja'),('TDLI205582','Media'),('TIRLI2028','Industrial de alta potencia')]:
    old = next(p for p in before['products'] if p['model'] == model)
    assert supplier[old['sku']]['availability'] == 'in stock'
    specs = {**old['specifications'], 'Gama': tier}
    tags = list(dict.fromkeys(old['tags'] + ['Atornilladores', 'Gama '+tier.lower()]))
    title, description = old['title'], old['description']
    if model == 'TSDLI08025':
        description = 'Gama baja: compacto para el hogar, armado de muebles y ajustes livianos.\n'+description
        specs['Uso recomendado'] = 'Hogar, armado de muebles y mantenimiento liviano'
    elif model == 'TDLI205582':
        description = 'Gama media: taladro atornillador inalámbrico de 20V para montaje, mantenimiento y perforación en madera o metal con la broca adecuada. Su motor sin escobillas entrega hasta 55 Nm; las dos velocidades mecánicas permiten elegir entre fuerza de atornillado y velocidad de perforación. Tiene mandril metálico de 13 mm, ajuste de torque 22+1 y luz LED de trabajo.\nIncluye una batería Total 20V de 2,0 Ah TFBLI20011, cargador TFCLI2001 para 220–240V y 47 accesorios.\nConsultá disponibilidad y condiciones de entrega antes de comprar.'
        specs.update({'Uso recomendado':'Montaje, mantenimiento y perforación en madera o metal','Voltaje':'20V','Torque máximo':'55 Nm','Motor':'Sin escobillas','Velocidad sin carga':'0–500 / 0–2.000 rpm','Mandril':'Metálico de 13 mm','Regulación de torque':'22+1','Batería incluida':'1 × 20V 2,0 Ah TFBLI20011','Cargador incluido':'TFCLI2001, 220–240V, 50/60 Hz','Accesorios':'47 piezas'})
    else:
        title = 'Total Atornillador de impacto industrial brushless 20V 285Nm TIRLI2028'
        description = 'Gama industrial de alta potencia: atornillador de impacto de 20V con motor sin escobillas y torque máximo de 285 Nm para fijaciones exigentes, montaje y trabajos de taller. El encastre hexagonal de 1/4 de pulgada utiliza puntas compatibles con impacto; elegí la velocidad y la punta según la fijación para evitar dañar el tornillo o la superficie. Dispone de tres velocidades y tres rangos de impacto. Para perforación con brocas convencionales, elegí un taladro con mandril.\nIncluye dos baterías de litio Total 20V de 2,0 Ah y cargador para 220–240V, 50/60 Hz.\nConsultá disponibilidad y condiciones de entrega antes de comprar.'
        specs.update({'Uso recomendado':'Fijaciones exigentes, montaje y taller','Voltaje':'20V','Torque máximo':'285 Nm','Motor':'Sin escobillas','Encastre':'Hexagonal de 6,35 mm (1/4 pulgada)','Velocidades':'0–1.600 / 0–1.900 / 0–2.600 rpm','Impactos':'0–2.100 / 0–2.500 / 0–2.900 por minuto','Baterías incluidas':'2 × 20V 2,0 Ah','Cargador incluido':'220–240V, 50/60 Hz','Puntas compatibles':'Aptas para impacto'})
    changes.append({'id':old['id'],'model':model,'slug':old['slug'],'retail_price':old['retail_price'],'title':title,'description':description,'tags':tags,'specifications':specs})

def literal(value):
    return "'"+value.replace("'","''")+"'"

sql = ['begin;']
for c in changes:
    old = next(p for p in before['products'] if p['id'] == c['id'])
    sql.append(f"update public.products set title={literal(c['title'])},description={literal(c['description'])},tags=ARRAY[{','.join(literal(t) for t in c['tags'])}]::text[],specifications={literal(json.dumps(c['specifications'],ensure_ascii=False))}::jsonb,updated_at=now() where id={literal(c['id'])}::uuid and title={literal(old['title'])} and retail_price={c['retail_price']};")
sql.append('commit;')
(out/'gamas-before.json').write_text(json.dumps(before,ensure_ascii=False,indent=2),encoding='utf8')
(out/'gamas-payload.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf8')
(out/'gamas-update.sql').write_text('\n'.join(sql),encoding='utf8')
print(json.dumps([{'model':c['model'],'tier':c['specifications']['Gama'],'price':c['retail_price']} for c in changes],ensure_ascii=False))

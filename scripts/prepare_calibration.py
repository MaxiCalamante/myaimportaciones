import json
import re
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Load raw product data
input_path = r'C:/Users/maxim/.gemini/antigravity/brain/856e20be-c83a-42f8-9359-d594b09bf3c3/.system_generated/steps/153/output.txt'
with open(input_path, 'r', encoding='utf-8') as f:
    text_p = json.load(f).get('result', '')

products = json.loads(re.search(r'<untrusted-data-[^>]+>\s*(\[.*?\])\s*</untrusted-data-', text_p, re.DOTALL).group(1))

def round_wholesale(price):
    if price < 10000:
        r = round(price / 100) * 100
        if r % 1000 == 0: r -= 100
        return max(r, 1000)
    elif price < 100000:
        r = round(price / 100) * 100
        rem = r % 1000
        if rem not in (500, 900):
            if rem < 500:
                r = (r // 1000) * 1000 - 100 if rem < 250 else (r // 1000) * 1000 + 500
            else:
                r = (r // 1000) * 1000 + 500 if rem < 750 else (r // 1000) * 1000 + 900
        return r
    else:
        r = round(price / 500) * 500
        if r % 1000 == 0: r -= 100
        return r

sql_updates = []
calibrated_products = []

for p in products:
    ret = float(p.get('product_retail') or 0)
    current_whs = float(p.get('product_wholesale') or 0)
    landed = float(p.get('landed_cost') or 0)
    orig = float(p.get('origin_cost') or 0)
    
    if landed <= 0 and orig > 0:
        landed = orig * 1.20 * 1600
    if landed <= 0:
        landed = ret * 0.55
        
    # Check broken retail reference
    adjusted_retail = ret
    if ret < landed * 1.15:
        adjusted_retail = round(landed * 1.60 / 100) * 100
        
    mya_floor = landed * 1.18 # MYA markup floor 18%
    reseller_target = adjusted_retail * 0.74 # 26% discount off retail
    
    if reseller_target >= mya_floor:
        target_whs = reseller_target
    else:
        if adjusted_retail > mya_floor * 1.08:
            target_whs = mya_floor
        else:
            target_whs = (adjusted_retail + landed) / 2
            
    final_whs = round_wholesale(target_whs)
    if final_whs >= adjusted_retail:
        final_whs = round_wholesale(adjusted_retail * 0.82)
    if final_whs < landed:
        final_whs = round_wholesale(landed * 1.10)
        
    # Minimum quantity rule
    min_qty = int(p.get('product_min_qty') or 4)
    if 'mascarilla' in p['product_title'].lower() and 'pack' not in p['product_title'].lower() and final_whs < 10000:
        min_qty = 10
    elif final_whs > 100000:
        min_qty = 3
    elif p['brand'] == 'Lattafa':
        min_qty = 3
    else:
        min_qty = 4
        
    calibrated_products.append({
        'id': p['product_id'],
        'sku': p.get('product_sku') or f"MYA-{p['product_id'][:8].upper()}",
        'brand': p.get('brand', '').strip(),
        'title': p.get('product_title', '').strip(),
        'category_name': p.get('category_name', 'Cosmética').strip(),
        'category_slug': p.get('category_slug', ''),
        'retail_price': adjusted_retail,
        'wholesale_price': final_whs,
        'min_qty': min_qty,
        'landed_cost': landed,
        'has_changed_price': (final_whs != current_whs or adjusted_retail != ret)
    })
    
    if final_whs != current_whs or adjusted_retail != ret:
        sql_updates.append(
            f"UPDATE products SET retail_price = {adjusted_retail:.2f}, wholesale_price = {final_whs:.2f}, wholesale_min_qty = {min_qty}, updated_at = NOW() WHERE id = '{p['product_id']}';"
        )

print(f"Total products calibrated: {len(calibrated_products)}")
print(f"Products requiring database update: {len(sql_updates)}")

# Write SQL file for updates
with open(r'c:\Users\maxim\OneDrive\Escritorio\MYAimportaciones\Tienda WEB\scripts\update_calibrated_prices.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_updates))
print("Saved update_calibrated_prices.sql")

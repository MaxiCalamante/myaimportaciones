import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const baseline=process.env.CART_TEST_BASELINE;
const bundle=await build({entryPoints:['tests/browser/cart-checkout.tsx'],bundle:true,write:false,jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'test',NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY:'quote_separately'})},plugins:[{name:'action-fixture',setup(b){
 b.onResolve({filter:/^@\/app\/checkout\/actions$/},()=>({path:resolve('tests/browser/checkout-actions.ts')}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export default function Link({children,...props}){return <a {...props}>{children}</a>}',loader:'jsx',resolveDir:process.cwd()}));
 if(baseline)b.onLoad({filter:/src\/(components\/commerce\/commerce-provider\.tsx|components\/checkout\/checkout-panel\.tsx|lib\/cart-reconcile\.ts)$/},args=>baseline==='checkout'&&!args.path.endsWith('checkout-panel.tsx')?null:({contents:execFileSync('git',['show',`HEAD:${args.path.split(process.cwd()+'/')[1]}`],{encoding:'utf8'}),loader:args.path.endsWith('tsx')?'tsx':'ts'}));
}}]});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<div id="root"></div><script src="/bundle.js"></script>')}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  page.setDefaultTimeout(10000);
  await page.route('**/api/wholesale/cart',r=>r.fulfill({json:{ok:true,policy:{minAmountArs:100000,minUnits:5},offers:[]}}));
  await page.route('**/api/cart/products?*',async r=>{const product=await page.evaluate(()=>JSON.parse(localStorage.getItem('mm-cart')||'[]')[0]?.product??window.testProduct).catch(()=>null);if(product)await r.fulfill({json:[product]});else await r.abort();});
  await page.route('**/api/favorites/products?*',r=>r.fulfill({json:[]}));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText('Agregar tres',{exact:true}).click();
  await expect(page.locator('#count')).toHaveText('3');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mm-cart')||'[]').reduce((s,l)=>s+l.quantity,0))).toBe(3);
  await page.waitForTimeout(400);
  await expect(page.locator('#count')).toHaveText('3');
  await page.getByText('Agregar desde ficha anterior',{exact:true}).click();
  await expect(page.locator('#count')).toHaveText('4');
  await page.getByRole('button',{name:'Reducir cantidad',exact:true}).click();
  await page.getByRole('button',{name:'Reducir cantidad',exact:true}).click();
  await expect(page.locator('#count')).toHaveText('2');
  await page.reload();await expect(page.locator('#count')).toHaveText('2');
  await page.getByText('Destino de prueba',{exact:true}).click();
  const submit=page.getByRole('button',{name:'Confirmar pedido',exact:true});
  await expect(submit).toBeEnabled();
  // Local estimate remains 90,000, but the current server quote validates 100,000.
  await page.evaluate(()=>{const cart=JSON.parse(localStorage.getItem('mm-cart'));cart[0].product.wholesalePrice=45000;localStorage.setItem('mm-cart',JSON.stringify(cart));});
  await page.reload();await expect(page.locator('#total')).toHaveText('90000');
  await expect(submit).toBeEnabled();
  await page.getByRole('button',{name:'Mercado Pago',exact:false}).click();
  await expect(submit).toBeEnabled();
  for(const [price,allowed] of [[49999.5,false],[50000,true],[50000.5,true]]){
   await page.evaluate(price=>sessionStorage.setItem('quoteState',JSON.stringify({price})),price);
   await page.reload();
   if(allowed)await expect(submit).toBeEnabled();else await expect(page.getByRole('button',{name:'Mínimo mayorista no alcanzado',exact:true})).toBeDisabled();
  }
  await page.evaluate(()=>sessionStorage.setItem('quoteState',JSON.stringify({price:50000,error:true})));
  await page.reload();await expect(page.getByRole('button',{name:'Mínimo mayorista no alcanzado',exact:true})).toBeDisabled();
  await page.evaluate(()=>sessionStorage.setItem('quoteState',JSON.stringify({price:18000})));
  await page.reload();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Aumentar cantidad',exact:true}).click();
  await expect(submit).toBeEnabled();
  await page.locator('select').first().selectOption('B');
  await page.locator('[name="city"]').fill('Tandil');
  await page.locator('[name="address"]').fill('San Martín 123');
  await page.locator('[name="name"]').fill('Cliente Prueba');
  await page.locator('[name="email"]').fill('prueba@example.com');
  await page.locator('[name="phone"]').fill('2494000000');
  await page.locator('[name="separate_shipping"]').check();
  // Submit only to the fixture action; no real orders or payments are created.
  if(width===1280)await page.getByRole('button',{name:'Mercado Pago',exact:false}).click();
  await expect(submit).toBeEnabled();
  await page.locator('[name="separate_shipping"]').check();
  await submit.click();
  await expect(page.getByRole('heading',{name:'¡Pedido registrado con éxito!'})).toBeVisible();
  if(width===390)await expect(page.getByText('0000003100045616945389',{exact:true})).toBeVisible();
  else await expect(page.getByRole('link',{name:'Continuar y pagar en Mercado Pago →'})).toHaveAttribute('href','https://www.mercadopago.com.ar/checkout/test');
  await expect(page.locator('#count')).toHaveText('0');
  console.log(`PASS ${width}px: 3 → 2, focus refresh, reload, server-approved minimum, both payment selections`);
  await page.close();
 }
}finally{await browser.close();server.close();}

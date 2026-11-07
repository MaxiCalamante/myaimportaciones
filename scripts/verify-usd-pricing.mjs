import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const folder=resolve('scratch/suppliers-private/post-audit-2026-11-06/ui');await mkdir(folder,{recursive:true});
const cssRoot=process.env.QA_BUILD_DIR??'.next';
const cssFiles=(await readdir(cssRoot+'/static/chunks')).filter(f=>f.endsWith('.css'));
const css=(await Promise.all(cssFiles.map(f=>readFile(`${cssRoot}/static/chunks/${f}`,'utf8')))).join('\n');
const bundle=await build({entryPoints:['tests/browser/usd-pricing.tsx'],bundle:true,write:false,jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'test',NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY:'quote_separately'})},plugins:[{name:'qa-stubs',setup(b){
 b.onResolve({filter:/^@\/app\/checkout\/actions$/},()=>({path:resolve('tests/browser/usd-actions.ts')}));
 b.onResolve({filter:/^next\/(link|image|navigation)$/},args=>({path:args.path,namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},args=>({loader:'jsx',resolveDir:process.cwd(),contents:args.path==='next/navigation'?'const router={refresh(){}};export function useRouter(){return router} export function usePathname(){return "/qa"}':args.path==='next/image'?'export default function Image({fill,quality,priority,...props}){return <img {...props}/>}':'export default function Link({children,...props}){return <a {...props}>{children}</a>}'}));
}}]});
const server=createServer(async(req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}
 if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 if(req.url==='/placeholder-product.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end(await readFile('public/placeholder-product.svg'));}
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
try{for(const width of [375,390,1280]){
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/wholesale/cart',r=>r.fulfill({json:{ok:true,policy:{minAmountArs:100000,minUnits:5},offers:[]}}));
 await page.route('**/api/cart/products?*',async r=>r.fulfill({json:[await page.evaluate(()=>window.testProduct)]}));
 await page.route('**/api/favorites/**',r=>r.fulfill({json:[]}));
 await page.goto(`http://127.0.0.1:${server.address().port}${width<500?'?sticky=1':''}`);
 await expect(page.getByText('USD 35,00',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('Aprox. $ 50.750 ARS',{exact:false}).first()).toBeVisible();
 await expect(page.getByText('Dólar Blue venta:',{exact:false}).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:resolve(folder,`${width}-catalog-detail.png`),fullPage:true});
 if(width<500){await expect(page.getByTestId('audit-sticky').getByText('USD 105,00',{exact:true})).toBeVisible();await expect(page.getByTestId('audit-sticky').getByText(/152.250/)).toBeVisible();}
 await expect(page.locator('#root > div').first()).not.toContainText('Atención de Máximo y Agustina');
 await page.getByRole('button',{name:'Agregar al carrito',exact:true}).first().click();
 if(!await page.getByRole('heading',{name:'Carrito',exact:true}).isVisible())await page.getByRole('button',{name:'Abrir carrito QA',exact:true}).click();
 await expect(page.getByText('Base por unidad: USD 35,00',{exact:true})).toBeVisible();
 await page.screenshot({path:resolve(folder,`${width}-cart.png`),fullPage:true});
 await page.getByRole('button',{name:/Cerrar carrito/}).click();
 await page.evaluate(()=>sessionStorage.setItem('usdQuoteMs','1500'));
 await page.getByRole('button',{name:'Ir al checkout QA',exact:true}).click();
 const submit=page.getByRole('button',{name:'Confirmar pedido',exact:true});await expect(submit).toBeEnabled();
 await expect(page.getByText('Cotización válida hasta',{exact:false})).toBeVisible();
 await expect(submit).toBeDisabled({timeout:5000});
 await expect(page.getByText('Cotización vencida:',{exact:false})).toBeVisible();
 await page.evaluate(()=>sessionStorage.setItem('usdQuoteMs','900000'));
 await page.getByRole('button',{name:/Actualizar|Recalcular|Calcular total/}).click();await expect(submit).toBeEnabled();
 await page.locator('select').first().selectOption('B');await page.locator('[name="city"]').fill('Tandil');await page.locator('[name="address"]').fill('Calle QA 123');await page.locator('[name="name"]').fill('Cliente QA');await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="phone"]').fill('2494000000');
 if(width===1280)await page.getByRole('button',{name:'Mercado Pago',exact:false}).click();
 await expect(submit).toBeEnabled();await page.locator('[name="separate_shipping"]').check();
 await page.screenshot({path:resolve(folder,`${width}-checkout.png`),fullPage:true});
 await submit.click();await expect(page.getByRole('heading',{name:'¡Pedido registrado con éxito!'})).toBeVisible();
 expect(await page.evaluate(()=>window.submitted.expectedTotal)).toBe(50750);
 await page.getByRole('button',{name:'Ver impresión QA'}).click();await expect(page.getByRole('heading',{name:'Selección mayorista'})).toBeVisible();await expect(page.getByRole('table').getByText('USD 25,00',{exact:true})).toBeVisible();await expect(page.getByRole('table').getByText('USD 75,00',{exact:true})).toBeVisible();await page.screenshot({path:resolve(folder,`${width}-wholesale-print.png`),fullPage:true});
 expect(errors).toEqual([]);console.log(`PASS ${width}px USD/ARS, ticker, card, detail, cart, expiry and ${width===1280?'MP':'transfer'} fixture`);await page.close();
}}finally{await browser.close();server.close();}

import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const folder=resolve('scratch/suppliers-private/commercial-usdt');await mkdir(folder,{recursive:true});
const css=(await postcss([tailwind()]).process(await readFile('src/app/globals.css','utf8'),{from:'src/app/globals.css'})).css;
const bundle=await build({entryPoints:['tests/browser/usdt-exchange.tsx'],bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'qa-navigation',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},()=>({loader:'js',contents:'const router={refresh(){}};export function useRouter(){return router}export function usePathname(){return "/qa"}'}));
}}]});
const server=createServer((req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}
 if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const report=[];
try{for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const origin=`http://127.0.0.1:${server.address().port}`;
 await page.goto(origin);
 await expect(page.getByText('USD 40,00',{exact:true})).toBeVisible();
 await expect(page.getByText('Aprox. $ 66.422 ARS',{exact:true})).toBeVisible();
 const ticker=page.locator('header span[title]');
 await expect(ticker).toHaveAttribute('title',/CriptoYa \+ Binance/);
 await expect(ticker).toHaveAttribute('title',/USDT comercial/);
 await expect(ticker).not.toHaveAttribute('title',/DolarAPI/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:resolve(folder,`${width}-usdt.png`),fullPage:true});
 await page.goto(origin+'?rate=1700');
 await expect(page.getByText('USD 40,00',{exact:true})).toBeVisible();
 await expect(page.getByText('Aprox. $ 68.000 ARS',{exact:true})).toBeVisible();
 await page.goto(origin+'?stale');
 await expect(page.getByText('a revalidar',{exact:true})).toBeVisible();
 await expect(page.getByText(/cotización vencida/)).toBeVisible();
 expect(errors).toEqual([]);report.push({width,status:'passed',usdBase:'40',arsAt1660_55:66422,arsAt1700:68000});
 await page.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));

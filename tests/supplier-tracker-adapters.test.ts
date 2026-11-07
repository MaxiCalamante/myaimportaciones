import test from'node:test';import assert from'node:assert/strict';
import{atacadoUsaAdapter}from'../src/lib/supplier-tracker/adapters/atacado-usa';
import{starCompanyAdapter}from'../src/lib/supplier-tracker/adapters/star-company';
import{atacadoConnectAdapter}from'../src/lib/supplier-tracker/adapters/atacado-connect';
import{totalAdapter}from'../src/lib/supplier-tracker/adapters/total';
import{sourceUrl,originalPrice,categoryIdentity}from'../src/lib/supplier-tracker/adapters/shared';
import{normalizeSourceCost}from'../src/lib/supplier-tracker/worker';
import{fetchTrackerHtml,robotsAllowed}from'../src/lib/supplier-tracker/network';
test('USA extracts only category cards, follows discovered pages and keeps unlabelled dollars and budget buttons unknown',()=>{
 const url='https://atacadousa.com.py/categoria/cosmeticos';const html='<div class="av-product-card"><h3><a href="/produto/9918">Crema QA 50 ml</a></h3><small>Ref. Q50</small><span class="av-price">$3,50</span><button data-av-id="9918" data-av-native-url="/cosmeticos/9918-qa.html?av_native=1">Orçamento</button></div><nav class="av-pagination"><a href="?p=1">1</a><a href="?p=2">2</a><a href="/categoria/perfumes?p=2">Otra</a></nav>';
 const result=atacadoUsaAdapter.listing(html,url,url);assert.equal(result.products.length,1);assert.equal(result.products[0].externalId,'9918');assert.equal(result.products[0].currency,null);assert.equal(result.products[0].cost,null);assert.equal(result.products[0].availability,'unknown');assert.equal(result.products[0].quantity,null);assert.match(result.products[0].nativeUrl!,/av_native=1/);assert.deepEqual(result.pages,[url+'?p=2']);
});
test('Star premium module aliases share category ownership, preserve sort boundaries and read explicit published quantity',()=>{
 const root='https://www.starcompany-py.com/index.php?fc=module&module=starcategorypremium&controller=category&id_category=100';const canonical='https://www.starcompany-py.com/categoria-premium/100';
 assert.equal(categoryIdentity(root,'star-company'),canonical);assert.equal(starCompanyAdapter.category(canonical),true);
 const html='<article class="scp-card"><a class="scp-img" href="/cosmeticos/123-qa.html"></a><div class="scp-body"><div class="scp-brand">QA</div><h2>Crema QA 50 ml</h2><div class="scp-price">U$ 28,00</div><div class="scp-stock in">0 In Stock</div></div></article><nav class="scp-pagination"><a href="/categoria-premium/100?fc=module&p=2&order=position">2</a><a href="/categoria-premium/200?p=3">Otra</a></nav>';
 const result=starCompanyAdapter.listing(html,root,root);assert.equal(result.products[0].cost,28);assert.equal(result.products[0].quantity,0);assert.equal(result.products[0].availability,'out_of_stock');assert.deepEqual(result.pages,[canonical+'?p=2']);
});
test('Connect ignores promotional banners, Total separates USD from guaranies and warns about tax scope',()=>{
 const connect='https://atacadoconnect.com/categoria/beleza-cuidado';const result=atacadoConnectAdapter.listing('<section><a href="/produto/otro/12"><img alt="Banner"></a></section><div class="product-slide"><a href="/produto/crema/15"><h3>Crema QA</h3><p>U$ 21,50</p></a></div>',connect,connect);assert.equal(result.products.length,1);assert.equal(result.products[0].externalId,'15');assert.equal(result.products[0].cost,21.5);assert.equal(result.products[0].availability,'unknown');
 const total='https://www.totalherramientasoficial.com.py/produtos/ferramentas/filter?d=1';const product=totalAdapter.listing('<div class="product"><div class="product-name"><a href="/produto/qa-53487.html">TOTAL TDSLI204281</a></div><div class="product-cat">#SKU 553872</div><div class="price">USD 76,00 Gs 516.800 PREÇO SEM I.V.A.</div></div>',total,total).products[0];assert.equal(product.cost,76);assert.equal(product.currency,'USD');assert.equal(product.sku,'553872');assert.equal(product.warnings.length,1);
});
test('normalization keeps origin/conversion separate and requires current documentary FX',()=>{
 const now=Date.now(),price={cost:68000,currency:'PYG' as const};assert.deepEqual(originalPrice('$3,50'),{cost:null,currency:null});assert.equal(normalizeSourceCost(price,{},now).normalizedUsd,null);
 const fx={currency:'PYG',unitsPerUsd:'6800',source:'Cotización documentada del proveedor',quotedAt:new Date(now).toISOString()};assert.equal(normalizeSourceCost(price,fx,now).normalizedUsd,'10.000000');assert.equal(normalizeSourceCost(price,fx,now+86400001).normalizedUsd,null);assert.equal(normalizeSourceCost({cost:12.5,currency:'USD'},{}).normalizedUsd,'12.500000');
});
test('only approved public domains are accepted; robots restrictions, redirects, CAPTCHA and outages remain technical issues',async()=>{
 for(const raw of ['https://127.0.0.1/private','https://atacadoconnect.com.evil.test/','http://atacadoconnect.com/','https://atacadoconnect.com/api/private','https://x:y@atacadoconnect.com/'])assert.throws(()=>sourceUrl(raw,raw,'atacado-connect'));
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /api/\nAllow: /api/public/','https://atacadoconnect.com/api/private'),false);assert.equal(robotsAllowed('User-agent: *\nDisallow: /api/\nAllow: /api/public/','https://atacadoconnect.com/api/public/1'),true);
 const fake=(handler:(url:string)=>Response)=>(async(input:RequestInfo|URL)=>handler(String(input)))as typeof fetch;
 await assert.rejects(fetchTrackerHtml('https://atacadoconnect.com/categoria/qa','atacado-connect',fake(url=>url.endsWith('/robots.txt')?new Response('User-agent: *\nDisallow: /categoria/'):new Response('NEVER'))),/restringida/);
 await assert.rejects(fetchTrackerHtml('https://www.starcompany-py.com/categoria-premium/1','star-company',fake(url=>url.endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('<title>Just a moment...</title>'))),/verificación/);
 await assert.rejects(fetchTrackerHtml('https://www.totalherramientasoficial.com.py/produtos/qa/filter','total',fake(url=>url.endsWith('/robots.txt')?new Response('',{status:404}):new Response('',{status:429}))),/429/);
});

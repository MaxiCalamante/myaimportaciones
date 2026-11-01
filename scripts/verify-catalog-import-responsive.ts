// Isolated layout verification. These fixtures never enter the application database.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from '@playwright/test';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {SupplierCatalogManager} from '../src/components/admin/supplier-catalog-manager';
import type {CatalogImportWorkspace} from '../src/lib/catalog-import-types';
const data:CatalogImportWorkspace={installed:true,total:1,page:1,pageSize:30,suppliers:[{id:'qa',name:'Proveedor QA'}],categories:[{id:'qa',name:'Categoría QA'}],pricing:null,jobs:[],candidates:[{id:'qa',title:'Equipo de prueba responsive con variante 256 GB y nombre extenso',brand:'QA',supplierName:'Proveedor QA',originCost:null,currency:null,availability:'unknown',checkedAt:null,linkedProductId:null,verification:'pending',price:null,margin:null,warnings:['Evidencia pendiente']} ]};
const markup=renderToStaticMarkup(createElement(SupplierCatalogManager,{initialData:data}));
const css=readdirSync('.next/static/chunks').filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/chunks/'+f,'utf8')).join('\n');
async function main(){
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('scratch/catalog-qa',{recursive:true});
try{for(const width of [320,390,1440]){const page=await browser.newPage({viewport:{width,height:1000}});await page.setContent(`<html lang="es-AR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-8">${markup}</main></body></html>`);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw new Error(`Desborde horizontal a ${width}px`);await page.getByRole('heading',{name:'Importación de catálogos'}).waitFor();await page.screenshot({path:`scratch/catalog-qa/import-${width}.png`,fullPage:true});console.log(JSON.stringify({width,horizontalOverflow:false,heading:true}));await page.close();}}finally{await browser.close();}

}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

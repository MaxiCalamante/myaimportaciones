import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importSupplierOpportunity, opportunityModel, buildRichProductDescription, opportunityImagesFromPage } from "../src/lib/supplier-opportunities";

const migration = readFileSync("supabase/migrations/20261020120000_supplier_intelligence.sql", "utf8");
const policy = JSON.parse(migration.match(/insert into public.import_cost_policies\(config\) values \('([\s\S]*?)'\);/)![1]);
policy.carrierArsPerUsd = 1600; policy.carrierFxDate = "2026-10-20";
const source = "https://www.totalherramientasoficial.com.py/produto/test-12053.html";
const offer = {id:"offer", supplier_id:"supplier", external_id:"381352",variant_key:"base",title:"TOTAL TGT11226 2000W", brand:"Total",model:"TGT11226",source_url:source,origin_cost:100,currency:"USD",availability:"in_stock",availability_checked_at:new Date().toISOString(),cost_checked_at:new Date().toISOString(),product_id:null};
function fakeDb(linkFails = false, linkedDuplicate = false) {
  const events: Array<{table:string; op:string; value:Record<string, unknown>}> = [];
  const db = { rpc: async () => ({data:0,error:null}), from(table:string) {
    let op = "select"; let value:Record<string, unknown> = {};
    const q = {select(){return q},eq(){return q},is(){return q},in(){return q},not(){return q},ilike(){return q},order(){return q},limit(){return q},
      insert(v:Record<string, unknown>){op="insert";value=v;events.push({table,op,value:v});return q},
      update(v:Record<string, unknown>){op="update";value=v;events.push({table,op,value:v});return q},
      upsert(v:Record<string, unknown>){op="upsert";value=v;events.push({table,op,value:v});return q},
      async maybeSingle(){if(table==="supplier_offers")return {data:linkedDuplicate?{id:"existing"}:null,error:null};if(table==="products")return {data:null,error:null}; if(table==="supplier_tracking_settings")return {data:{config:{acquisitionArsPerUsd:1600,shippingPaidByMya:false,shippingArs:0}},error:null}; if(table==="import_cost_policies")return {data:{config:policy},error:null}; if(table==="product_costs")return {data:null,error:null}; return {data:null,error:null}},
      async single(){if(table==="supplier_offers"&&op==="update")return {data:linkFails?null:{id:"offer"},error:linkFails?{message:"link failed"}:null}; if(table==="supplier_offers")return {data:offer,error:null}; if(table==="suppliers")return {data:{id:"supplier",website:"https://www.totalherramientasoficial.com.py",official_key:"total",automation_authorized:true,is_active:true},error:null};if(table==="categories")return {data:{id:"cat",slug:"herramientas-equipamiento",name:"Herramientas"},error:null};if(table==="products"&&op==="insert")return {data:{id:"new",slug:value.slug,title:value.title},error:null};return {data:{id:"new"},error:null}}
    }; return q;
  }};
  return {db: db as unknown as SupabaseClient,events};
}
test("la importación individual no permite omitir la revisión ni publica fotos sin derechos", async()=>{
 const {db,events}=fakeDb();
 await assert.rejects(importSupplierOpportunity({offerId:'offer',title:'Equipo',categoryId:'cat',retailPrice:100,isActive:true},{client:db}),/borrador/);
 assert.equal(events.length,0);
});

test("modelos extraídos sin perder sufijos y sin adivinar ante varias opciones", () => {
  assert.equal(opportunityModel("TOTAL PISTOLA 500W 800ML TT5006-2", ""), "TT5006-2");
  assert.equal(opportunityModel("TOTAL TGT11226 2000W", null), "TGT11226");
  assert.equal(opportunityModel("TOTAL TGT11226 TGT11316", null), "");
});

test("descripciones sólo conservan identidad informada sin inventar prestaciones",()=>{
 const desc=buildRichProductDescription({title:'Pistola 500W',brand:'Total',model:'TT5006-2',categorySlug:'pistolas',categoryName:'Pistolas'});
 assert.match(desc,/Pistola 500W/);assert.match(desc,/TT5006-2/);
 assert.doesNotMatch(desc,/HVLP|220|garantía|Correo|descuento/i);
});

test("opportunityImagesFromPage extrae galería de alta resolución 1500px y JSON-LD", () => {
  const html = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@type": "Product",
          "productID": "12345",
          "image": [
            "https://www.totalherramientasoficial.com.py/img/12345/produtos/400/foto1.jpg",
            "https://www.totalherramientasoficial.com.py/img/12345/produtos/400/foto2.jpg"
          ]
        }
        </script>
      </head>
      <body>
        <img src="https://www.totalherramientasoficial.com.py/img/12345/produtos/qm/foto1.jpg" data-zoom-image="https://www.totalherramientasoficial.com.py/img/12345/produtos/1500/foto1.jpg" />
        <img src="https://www.totalherramientasoficial.com.py/img/12345/produtos/400/foto2.jpg" />
        <img src="https://www.totalherramientasoficial.com.py/img/99999/produtos/400/related.jpg" />
      </body>
    </html>
  `;

  const res = opportunityImagesFromPage(html, {
    external_id: "12345",
    variant_key: "base",
    source_url: "https://www.totalherramientasoficial.com.py/produto/item-12345.html",
  });

  assert.equal(res.mainImage, "https://www.totalherramientasoficial.com.py/img/12345/produtos/1500/foto1.jpg");
  assert.equal(res.galleryImages.length, 2);
  assert.equal(res.galleryImages[0], "https://www.totalherramientasoficial.com.py/img/12345/produtos/1500/foto1.jpg");
  assert.equal(res.galleryImages[1], "https://www.totalherramientasoficial.com.py/img/12345/produtos/1500/foto2.jpg");
  // Asegura que no incluya productos relacionados de otros trayIds (99999)
  assert.equal(res.galleryImages.some(img => img.includes("99999")), false);
});

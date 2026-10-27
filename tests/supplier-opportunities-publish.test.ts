import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importSupplierOpportunity, opportunityModel } from "../src/lib/supplier-opportunities";

const migration = readFileSync("supabase/migrations/20261020120000_supplier_intelligence.sql", "utf8");
const policy = JSON.parse(migration.match(/insert into public.import_cost_policies\(config\) values \('([\s\S]*?)'\);/)![1]);
policy.carrierArsPerUsd = 1600; policy.carrierFxDate = "2026-10-20";
const source = "https://www.totalherramientasoficial.com.py/produto/test-12053.html";
const image = "https://www.totalherramientasoficial.com.py/img/12053/produtos/1500/test.jpg";
const offer = {id:"offer", supplier_id:"supplier", external_id:"381352",variant_key:"base",title:"TOTAL TGT11226 2000W", brand:"Total",model:"TGT11226",source_url:source,origin_cost:100,currency:"USD",availability:"in_stock",availability_checked_at:new Date().toISOString(),cost_checked_at:new Date().toISOString(),product_id:null};
function fakeDb(linkFails = false, linkedDuplicate = false) {
  const events: Array<{table:string; op:string; value:Record<string, unknown>}> = [];
  const db = { rpc: async () => ({data:0,error:null}), from(table:string) {
    let op = "select"; let value:Record<string, unknown> = {};
    const q = {select(){return q},eq(){return q},is(){return q},in(){return q},not(){return q},order(){return q},limit(){return q},
      insert(v:Record<string, unknown>){op="insert";value=v;events.push({table,op,value:v});return q},
      update(v:Record<string, unknown>){op="update";value=v;events.push({table,op,value:v});return q},
      async maybeSingle(){if(table==="supplier_offers")return {data:linkedDuplicate?{id:"existing"}:null,error:null};if(table==="products")return {data:null,error:null}; if(table==="supplier_tracking_settings")return {data:{config:{acquisitionArsPerUsd:1600,shippingPaidByMya:false,shippingArs:0}},error:null}; if(table==="import_cost_policies")return {data:{config:policy},error:null};return {data:null,error:null}},
      async single(){if(table==="supplier_offers"&&op==="update")return {data:linkFails?null:{id:"offer"},error:linkFails?{message:"link failed"}:null}; if(table==="supplier_offers")return {data:offer,error:null}; if(table==="suppliers")return {data:{id:"supplier",website:"https://www.totalherramientasoficial.com.py",official_key:"total",automation_authorized:true,is_active:true},error:null};if(table==="categories")return {data:{id:"cat",slug:"herramientas-equipamiento",name:"Herramientas"},error:null};if(table==="products"&&op==="insert")return {data:{id:"new",slug:value.slug,title:value.title},error:null};return {data:{id:"new"},error:null}}
    }; return q;
  }};
  return {db: db as unknown as SupabaseClient,events};
}
function response(text:string,url:string) { const r=new Response(text,{status:200}); Object.defineProperty(r,"url",{value:url});return r; }
test("publicación rápida usa foto de ficha exacta y activa solo después de vincular", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => response(String(url).endsWith("/robots.txt") ? "User-agent: *\nDisallow:" : `<script type="application/ld+json">${JSON.stringify({"@type":"Product",productID:"381352",image})}</script>`,String(url));
  try {
    const {db,events}=fakeDb();
    await importSupplierOpportunity({offerId:"offer",title:"Total TGT11226 2000W",categoryId:"cat",retailPrice:100000,isActive:true},{client:db});
    assert.equal(events[0].value.is_active,false);assert.equal(events[0].value.image_url,image);
    assert.deepEqual(events.map(e=>[e.table,e.op]),[["products","insert"],["supplier_offers","update"],["products","update"]]);
    const failure=fakeDb(true);
    await assert.rejects(importSupplierOpportunity({offerId:"offer",title:"Total TGT11226 2000W",categoryId:"cat",retailPrice:100000,isActive:true},{client:failure.db}),/borrador/);
    assert.equal(failure.events.some(e=>e.table==="products"&&e.op==="update"),false);
    const duplicate=fakeDb(false,true);
    await assert.rejects(importSupplierOpportunity({offerId:"offer",title:"Total TGT11226 2000W",categoryId:"cat",retailPrice:100000,isActive:true},{client:duplicate.db}),/duplicado/);
    assert.equal(duplicate.events.length,0);
    globalThis.fetch = async (url) => response(`<script type="application/ld+json">${JSON.stringify({"@type":"Product",productID:"other",image})}</script>`,String(url));
    const missing=fakeDb();
    await assert.rejects(importSupplierOpportunity({offerId:"offer",title:"Total TGT11226 2000W",categoryId:"cat",retailPrice:100000,isActive:true},{client:missing.db}),/foto/);
    assert.equal(missing.events.length,0);
  } finally {globalThis.fetch=original;}
});

test("modelos extraídos sin perder sufijos y sin adivinar ante varias opciones", () => {
  assert.equal(opportunityModel("TOTAL PISTOLA 500W 800ML TT5006-2", ""), "TT5006-2");
  assert.equal(opportunityModel("TOTAL TGT11226 2000W", null), "TGT11226");
  assert.equal(opportunityModel("TOTAL TGT11226 TGT11316", null), "");
});

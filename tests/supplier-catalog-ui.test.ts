import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SupplierCatalogManager } from "../src/components/admin/supplier-catalog-manager";
import type { CatalogImportWorkspace, CatalogReview } from "../src/lib/catalog-import-types";

const workspace: CatalogImportWorkspace = {
  installed: true, total: 1, page: 1, pageSize: 30,
  suppliers: [{ id: "supplier-qa", name: "Proveedor de prueba" }],
  categories: [{ id: "category-qa", name: "Categoría de prueba" }],
  candidates: [{ id: "offer-qa", title: "Equipo QA variante 256 GB", brand: "QA", supplierName: "Proveedor de prueba", originCost: null, currency: null, availability: "unknown", checkedAt: null, linkedProductId: null, verification: "pending", price: null, margin: null, warnings: ["Falta evidencia de costo"] }],
  jobs: [{ id: "job-qa", state: "queued", created_at: "2026-11-01T12:00:00Z", config: {}, counts: { total: 8, pending: 5, imported: 2, failed: 1 } }],
  pricing: null,
};

test("bulk catalog renders labelled selection, explicit category, real job counts and unknown costs", () => {
  const html = renderToStaticMarkup(createElement(SupplierCatalogManager, { initialData: workspace }));
  assert.match(html, /Importación de catálogos/);
  assert.match(html, /Seleccionar Equipo QA variante 256 GB/);
  assert.match(html, /Categoría de destino/);
  assert.match(html, /Todos los resultados filtrados/);
  assert.match(html, /Sin costo confirmado/);
  assert.match(html, /Sin precio calculable/);
  assert.match(html, /Límite de ofertas/);
  assert.match(html, /value="150"/);
  assert.match(html, /Procesar hasta 20/);
  assert.match(html, /2 importadas/);
  assert.match(html, /1 con error/);
  assert.match(html, /overflow-x-auto/);
  assert.doesNotMatch(html, /USD\s*0|\$0,00/);
  assert.match(html, /name="targetMarginPercent"[^>]*value=""/);
});

test("missing catalog migration shows recovery guidance without import controls", () => {
  const html = renderToStaticMarkup(createElement(SupplierCatalogManager, { initialData: { ...workspace, installed: false } }));
  assert.match(html, /migración/i);
  assert.doesNotMatch(html, /Generar vista previa|Procesar hasta 20|Guardar reglas/);
});

test("documentary review exposes evidence and explicit publish separately from import", () => {
  const review: CatalogReview = { product_id: "product-qa", title: "Borrador QA", state: "pending", identity_confirmed: false, costs_confirmed: false, media_authorized: false, compliance_confirmed: false, evidence: "" };
  const html = renderToStaticMarkup(createElement(SupplierCatalogManager, { initialData: workspace, initialReviews: [review] }));
  assert.match(html, /Identidad y variante exacta/);
  assert.match(html, /Costos completos y vigentes/);
  assert.match(html, /Derechos de fotos y material/);
  assert.match(html, /Cumplimiento documental/);
  assert.match(html, /Evidencia y referencias/);
  assert.match(html, /Publicar producto revisado/);
  assert.match(html, /\/admin\?editProduct=product-qa/);
  assert.match(html, /\/admin\/costos/);
});

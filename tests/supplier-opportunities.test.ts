import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanWholesaleTitle,
  detectStoreCategory,
  type CategoryInfo,
} from "../src/lib/supplier-opportunities";
import {
  calculateLandedCostArs,
  calculateSuggestedRetailPrice,
  calculateCommercialMargin,
  getCategoryMarginBenchmark,
} from "../src/lib/supplier-commercial";

const mockCategories: CategoryInfo[] = [
  { id: "cat-1", name: "Perfumería", slug: "perfumeria", parentId: null, imageUrl: "/perfume.jpg" },
  { id: "cat-2", name: "Perfumes árabes", slug: "perfumes-arabes", parentId: "cat-1", imageUrl: "/arabes.jpg" },
  { id: "cat-3", name: "Body mists y brumas", slug: "body-mists-brumas", parentId: "cat-1", imageUrl: "/mist.jpg" },
  { id: "cat-4", name: "Cosmética facial y corporal", slug: "cosmetica-coreana", parentId: null, imageUrl: "/kbeauty.jpg" },
  { id: "cat-5", name: "Sérums y ampollas faciales", slug: "serums-ampollas", parentId: "cat-4", imageUrl: "/serum.jpg" },
  { id: "cat-6", name: "Tónicos, pads y brumas", slug: "tonicos-pads", parentId: "cat-4", imageUrl: "/toner.jpg" },
  { id: "cat-7", name: "Cuidado del cabello", slug: "cuidado-capilar", parentId: null, imageUrl: "/capilar.jpg" },
  { id: "cat-8", name: "Mascarillas y tratamientos capilares", slug: "tratamientos-mascarillas-capilares", parentId: "cat-7", imageUrl: "/mascara.jpg" },
  { id: "cat-9", name: "Electrónica", slug: "electronica", parentId: null, imageUrl: "/tech.jpg" },
  { id: "cat-10", name: "Smartphones", slug: "electronica-smartphones", parentId: "cat-9", imageUrl: "/phones.jpg" },
  { id: "cat-11", name: "Notebooks", slug: "electronica-notebooks", parentId: "cat-9", imageUrl: "/laptops.jpg" },
  { id: "cat-12", name: "Herramientas y equipamiento", slug: "herramientas-equipamiento", parentId: null, imageUrl: "/tools.jpg" },
  { id: "cat-13", name: "Taladros y rotomartillos", slug: "taladros-rotomartillos", parentId: "cat-12", imageUrl: "/taladro.jpg" },
];

test("cleanWholesaleTitle elimina prefijos técnicos de mayorista y normaliza texto", () => {
  assert.equal(
    cleanWholesaleTitle("PERF FEM CHLOE L'EAU DE PARFUM INTENSE 50ML"),
    "Perfume Chloe L'eau de Parfum Intense 50ML"
  );
  assert.equal(
    cleanWholesaleTitle("PERF TESTER MASC CAROLINA HERRERA BAD BOY 100ML"),
    "Perfume Tester Carolina Herrera Bad Boy 100ML"
  );
  assert.equal(
    cleanWholesaleTitle("MIST CORP VICTORIA SECRET PURE SEDUCTION 250ML"),
    "Body Mist Victoria Secret Pure Seduction 250ML"
  );
});

test("detectStoreCategory clasifica correctamente fragancias árabes, k-beauty, capilar, tech y herramientas", () => {
  // Perfumes árabes
  const perfume = detectStoreCategory("Lattafa Yara Eau de Parfum 100ml", mockCategories);
  assert.equal(perfume.categorySlug, "perfumes-arabes");

  // K-Beauty Toner Pad
  const kbeauty = detectStoreCategory("Medicube PDRN Pink Collagen Toner Pad 70 pads", mockCategories);
  assert.equal(kbeauty.categorySlug, "tonicos-pads");

  // K-Beauty Serum
  const serum = detectStoreCategory("Skin1004 Madagascar Centella Ampoule 100ml", mockCategories);
  assert.equal(serum.categorySlug, "serums-ampollas");

  // Cuidado Capilar Mascarilla
  const capilar = detectStoreCategory("Karseell Maca Power Essence Mascara Capilar 500ml", mockCategories);
  assert.equal(capilar.categorySlug, "tratamientos-mascarillas-capilares");

  // Smartphone
  const phone = detectStoreCategory("Apple iPhone 17 Pro Max 256GB Naranja Cósmico", mockCategories);
  assert.equal(phone.categorySlug, "electronica-smartphones");

  // Notebook
  const laptop = detectStoreCategory("Apple MacBook Neo 13 Chip A18 Pro 256GB SSD", mockCategories);
  assert.equal(laptop.categorySlug, "electronica-notebooks");

  // Herramienta
  const tool = detectStoreCategory("Total Taladro Rotomartillo 800W TH308266", mockCategories);
  assert.equal(tool.categorySlug, "taladros-rotomartillos");
});

test("cálculo financiero: USD 25 a Dólar 1600 + 20% pasero da Landed ARS $48.000", () => {
  const { baseArs, paseroFeeArs, totalLandedArs } = calculateLandedCostArs(25, 1600, 20);
  assert.equal(baseArs, 40000);
  assert.equal(paseroFeeArs, 8000);
  assert.equal(totalLandedArs, 48000);
});

test("cálculo financiero: sugerencia de precio para Perfumería aplica benchmark 50% y terminación psicológica", () => {
  const landedArs = 48000;
  const benchmark = getCategoryMarginBenchmark("perfumes-arabes", "Lattafa Yara EDP 100ml");
  assert.equal(benchmark.benchmarkMargin, 50);

  // Exacto: 48.000 / (1 - 0.50) = 96.000 -> con psychologicalEnding: 95.900
  const { suggestedPrice, estimatedMarginPercent, estimatedProfitArs } = calculateSuggestedRetailPrice(
    landedArs,
    "perfumes-arabes",
    "Lattafa Yara EDP 100ml",
    { psychologicalEnding: true }
  );

  assert.equal(suggestedPrice, 95900);
  assert.ok(estimatedMarginPercent >= 49.5);
  assert.equal(estimatedProfitArs, 95900 - 48000);
});

test("cálculo financiero: evaluación de margen saludable y positivo", () => {
  const landed = 48000;
  const retail = 95900;
  const { marginPercent, markupPercent, profitArs } = calculateCommercialMargin(retail, landed);

  assert.equal(profitArs, 47900);
  assert.ok(marginPercent > 49);
  assert.ok(markupPercent > 99); // Markup sobre costo ~99.8%
});

test("imagen de oportunidad exige identidad exacta y variante inequívoca", async () => {
  const { imageFromOpportunityPage } = await import("../src/lib/supplier-opportunities");
  const page = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", productID: "381352", image: "https://www.totalherramientasoficial.com.py/img/12053/produtos/1500/8effc1499399a35089d3afdf94923fd9.jpg" })}</script>`;
  const offer = { external_id: "381352", variant_key: "base", source_url: "https://www.totalherramientasoficial.com.py/produto/test" };
  assert.match(imageFromOpportunityPage(page, offer) || "", /12053/);
  assert.equal(imageFromOpportunityPage(page, { ...offer, external_id: "other" }), null);
  assert.equal(imageFromOpportunityPage(page, { ...offer, variant_key: "attribute:2" }), null);
  assert.equal(imageFromOpportunityPage(page + page, offer), null);
  const relatedOnly = `<script type="application/ld+json">${JSON.stringify({ "@type": "ItemList", itemListElement: [{ "@type": "Product", productID: "381352", image: "https://www.totalherramientasoficial.com.py/img/12053/a.jpg" }] })}</script>`;
  assert.equal(imageFromOpportunityPage(relatedOnly, offer), null);
  assert.equal(imageFromOpportunityPage(page.replace("www.totalherramientasoficial.com.py/img", "example.com/img"), offer), null);
});

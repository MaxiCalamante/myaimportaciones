import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import {
  cleanWholesaleTitle,
  detectStoreCategory,
  type CategoryInfo
} from "../src/lib/supplier-opportunities";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Falta configuración de Supabase.");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const STAR_SUPPLIER_ID = "0a205148-e80f-4321-ab89-e9974e5f473d";
const FX_RATE = 1550;
const PASERO_RATE = 1.20;

interface ScrapedStarCard {
  externalId: string;
  title: string;
  brand: string;
  priceUsd: number;
  imageUrl: string;
  productUrl: string;
  stockQty: number;
  isAvailable: boolean;
  categorySlug: "cosmeticos" | "perfumes" | "celulares";
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseStarCategoryPage(html: string, categorySlug: "cosmeticos" | "perfumes" | "celulares"): ScrapedStarCard[] {
  const cardRegex = /<article class="scp-card">([\s\S]*?)<\/article>/gi;
  const cards = [...html.matchAll(cardRegex)];
  const results: ScrapedStarCard[] = [];

  for (const match of cards) {
    const cardHtml = match[1];

    // URL & ID
    const urlMatch = cardHtml.match(/<a[^>]+class="scp-img"[^>]+href="([^"]+)"/i)
      || cardHtml.match(/<h2><a[^>]+href="([^"]+)"/i);
    const productUrl = urlMatch ? urlMatch[1].trim() : "";
    const idMatch = productUrl.match(/\/(\d+)-[^\/]+\.html/i);
    const externalId = idMatch ? idMatch[1] : null;

    // Title
    const titleMatch = cardHtml.match(/<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>/i)
      || cardHtml.match(/<img[^>]+alt="([^"]+)"/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    const title = decodeHtml(rawTitle);

    // Brand
    const brandMatch = cardHtml.match(/<div class="scp-brand">([\s\S]*?)<\/div>/i);
    const brand = brandMatch ? decodeHtml(brandMatch[1].replace(/<[^>]+>/g, "").trim()) : "";

    // Price USD
    const priceMatch = cardHtml.match(/<div class="scp-price">([\s\S]*?)<\/div>/i);
    let priceUsd = 0;
    if (priceMatch) {
      const cleanPrice = priceMatch[1].replace(/[^\d.,]/g, "").replace(",", ".");
      priceUsd = parseFloat(cleanPrice) || 0;
    }

    // Stock
    const stockMatch = cardHtml.match(/<div class="scp-stock([^"]*)">([\s\S]*?)<\/div>/i);
    const stockClass = stockMatch ? stockMatch[1] : "";
    const stockRaw = stockMatch ? stockMatch[2].replace(/<[^>]+>/g, "").trim() : "";
    const numMatch = stockRaw.match(/(\d+)/);
    const stockQty = numMatch ? parseInt(numMatch[1], 10) : 0;
    const isOutOfStock = stockClass.includes("out") || /esgotado|sem estoque|sin stock|indispon/i.test(stockRaw) || (numMatch && stockQty === 0);
    const isAvailable = !isOutOfStock && (stockClass.includes("in") || stockQty > 0 || /in stock/i.test(stockRaw));

    // Image URL
    const imgMatch = cardHtml.match(/<img[^>]+src="([^"]+)"/i);
    let imageUrl = imgMatch ? imgMatch[1].trim() : "";
    if (imageUrl) {
      imageUrl = imageUrl.replace("-home_default", "-large_default").replace("/home_default/", "/large_default/");
    }

    if (externalId && title && priceUsd > 0) {
      results.push({
        externalId,
        title,
        brand,
        priceUsd,
        imageUrl,
        productUrl,
        stockQty,
        isAvailable,
        categorySlug
      });
    }
  }

  return results;
}

const KNOWN_BRANDS = [
  "Maison Alhambra", "Lattafa", "Karseell", "Afnan", "Armaf", "Al Haramain",
  "Fragrance World", "Orientica", "Medicube", "SKIN1004", "Skin1004", "Anua",
  "Celimax", "Dr. Althea", "Torriden", "Round Lab", "Cosrx", "Kérastase",
  "Kerastase", "Shiseido", "Tree Hut", "Bath & Body Works", "Victoria's Secret",
  "Dior", "Chanel", "Carolina Herrera", "Paco Rabanne", "Versace", "Calvin Klein",
  "Giorgio Armani", "Yves Saint Laurent", "Lancôme", "Montblanc", "Hugo Boss",
  "Jean Paul Gaultier", "Dolce & Gabbana", "Burberry", "Bvlgari", "Azzaro",
  "Moschino", "Givenchy", "Gucci", "Prada", "Rabanne", "Joop", "Nautica",
  "Apple", "Samsung", "Xiaomi", "Realme", "Motorola"
];

function extractBrand(title: string, rawBrand?: string): string {
  if (rawBrand && rawBrand.trim().length > 1) return rawBrand.trim();
  for (const b of KNOWN_BRANDS) {
    const reg = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (reg.test(title)) return b;
  }
  const stripped = title.replace(/^(?:Perfume|Kit|Crema|Aceite|Serum|Mascara)\s+/i, "").trim();
  const words = stripped.split(/\s+/);
  return words[0] || "General";
}

function formatCommercialTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle.trim();
  clean = clean.replace(/\s*\(\d+\)\s*$/g, "");
  clean = clean.replace(/\b(?:SKU|COD|REF|ID):\s*[A-Z0-9-]+\b/gi, "");
  clean = clean.replace(/\bMASCULINO\b/gi, "Masculino");
  clean = clean.replace(/\bFEMENINO\b|\bFEMININO\b/gi, "Femenino");
  clean = clean.replace(/\bUNISSEX\b|\bUNISEX\b/gi, "Unisex");
  clean = clean.replace(/\bOLEO\b/gi, "Aceite");
  clean = clean.replace(/\bCREME\b/gi, "Crema");
  clean = clean.replace(/^PERFUME\s+/i, "Perfume ");
  clean = clean.replace(/^KIT\s+/i, "Kit ");
  clean = cleanWholesaleTitle(clean);
  clean = clean.replace(/^PERFUME\b/i, "Perfume");
  clean = clean.replace(/^KIT\b/i, "Kit");
  clean = clean.replace(/(\d+)\s*ML\b/gi, "$1 ml");
  clean = clean.replace(/(\d+)\s*G\b/gi, "$1 g");
  return clean.replace(/\s{2,}/g, " ").trim();
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageWithRetry(url: string, retries = 3): Promise<string> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,pt-BR;q=0.8,pt;q=0.7,en;q=0.6"
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        return await res.text();
      }
      console.warn(`[SCRAPER] HTTP ${res.status} on ${url} (attempt ${attempt}/${retries})`);
      if (res.status === 404) return "";
    } catch (err: any) {
      console.warn(`[SCRAPER] Fetch error on ${url}: ${err.message} (attempt ${attempt}/${retries})`);
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  return "";
}

async function main() {
  console.log("=== INICIANDO SINCRONIZACIÓN STAR COMPANY (PERFUMES, COSMÉTICOS, CELULARES) ===");
  const startTime = Date.now();

  // 1. Cargar categorías de la base de datos
  const { data: dbCategories, error: catErr } = await supabase.from("categories").select("*");
  if (catErr || !dbCategories) throw new Error(`Error cargando categorías: ${catErr?.message}`);
  const categories: CategoryInfo[] = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    imageUrl: c.image_url,
  }));
  console.log(`[INIT] ${categories.length} categorías disponibles.`);

  // 2. Cargar todos los productos del catálogo de MYA (activos y no eliminados)
  const { data: dbProducts, error: prodErr } = await supabase
    .from("products")
    .select("id, title, slug, brand, model, sku, source_url, retail_price, wholesale_price, supplier_live_price, supplier_available, supplier_stock_status, fulfillment_mode, category_id, image_url, image_urls, is_active")
    .is("deleted_at", null);
  if (prodErr || !dbProducts) throw new Error(`Error cargando productos: ${prodErr?.message}`);
  const allProducts = dbProducts || [];
  console.log(`[INIT] ${allProducts.length} productos en el catálogo de MYA.`);

  // 3. Cargar ofertas existentes en supplier_offers para Star Company y otros proveedores
  // Limpiar variantes legacy 'listing:%' de Star Company para unificar a 'attribute:0'
  const { data: legacyOffers } = await supabase
    .from("supplier_offers")
    .select("id")
    .eq("supplier_id", STAR_SUPPLIER_ID)
    .like("variant_key", "listing:%");

  if (legacyOffers && legacyOffers.length > 0) {
    console.log(`[CLEANUP] Eliminando ${legacyOffers.length} registros obsoletos 'listing:%' de Star Company...`);
    const legacyIds = legacyOffers.map((o) => o.id);
    for (let i = 0; i < legacyIds.length; i += 100) {
      await supabase.from("supplier_offers").delete().in("id", legacyIds.slice(i, i + 100));
    }
  }

  const { data: dbOffers, error: offErr } = await supabase
    .from("supplier_offers")
    .select("id, supplier_id, product_id, external_id, variant_key, source_url, origin_cost, currency, availability, verification");
  if (offErr) throw new Error(`Error cargando ofertas: ${offErr.message}`);
  const allOffers = dbOffers || [];
  console.log(`[INIT] ${allOffers.length} ofertas cargadas en supplier_offers.`);

  // Mapeos rápidos
  type ProductItem = typeof allProducts[number];
  type OfferItem = typeof allOffers[number];

  const productsById = new Map<string, ProductItem>();
  for (const p of allProducts) {
    productsById.set(p.id, p);
  }

  // Ofertas de Star Company por external_id
  const starOffersByExtId = new Map<string, OfferItem>();
  for (const o of allOffers) {
    if (o.supplier_id === STAR_SUPPLIER_ID && o.external_id) {
      starOffersByExtId.set(String(o.external_id), o);
    }
  }

  // Ofertas por product_id para evaluar dual supplier
  const offersByProductId = new Map<string, OfferItem[]>();
  for (const o of allOffers) {
    if (o.product_id) {
      const list = offersByProductId.get(o.product_id) || [];
      list.push(o);
      offersByProductId.set(o.product_id, list);
    }
  }

  // 4. Scrapear las 3 categorías
  const scrapedCards: ScrapedStarCard[] = [];
  const processedExtIds = new Set<string>();

  // A) Cosméticos: Cat 100 (p=1..26)
  console.log("\n--- Scraping Cosméticos (Categoría 100: 26 páginas) ---");
  for (let p = 1; p <= 26; p++) {
    const url = `https://www.starcompany-py.com/categoria-premium/100?fc=module&p=${p}&order=position`;
    const html = await fetchPageWithRetry(url);
    if (!html) continue;
    const cards = parseStarCategoryPage(html, "cosmeticos");
    let added = 0;
    for (const c of cards) {
      if (!processedExtIds.has(c.externalId)) {
        processedExtIds.add(c.externalId);
        scrapedCards.push(c);
        added++;
      }
    }
    console.log(`[COSMÉTICOS] Página ${p}/26: ${cards.length} tarjetas (${added} nuevas). Total acumulado: ${scrapedCards.length}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  // B) Perfumes: Cat 121 (p=1..97)
  console.log("\n--- Scraping Perfumes (Categoría 121: 97 páginas) ---");
  for (let p = 1; p <= 97; p++) {
    const url = `https://www.starcompany-py.com/categoria-premium/121?fc=module&p=${p}&order=position`;
    const html = await fetchPageWithRetry(url);
    if (!html) continue;
    const cards = parseStarCategoryPage(html, "perfumes");
    let added = 0;
    for (const c of cards) {
      if (!processedExtIds.has(c.externalId)) {
        processedExtIds.add(c.externalId);
        scrapedCards.push(c);
        added++;
      }
    }
    if (p % 10 === 0 || p === 97) {
      console.log(`[PERFUMES] Página ${p}/97: ${cards.length} tarjetas (${added} nuevas). Total acumulado: ${scrapedCards.length}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // C) Celulares: Cat 27 (p=1)
  console.log("\n--- Scraping Celulares (Categoría 27: 1 página) ---");
  {
    const url = `https://www.starcompany-py.com/categoria-premium/27?fc=module&p=1&order=position`;
    const html = await fetchPageWithRetry(url);
    if (html) {
      const cards = parseStarCategoryPage(html, "celulares");
      let added = 0;
      for (const c of cards) {
        if (!processedExtIds.has(c.externalId)) {
          processedExtIds.add(c.externalId);
          scrapedCards.push(c);
          added++;
        }
      }
      console.log(`[CELULARES] Página 1/1: ${cards.length} tarjetas (${added} nuevas). Total acumulado: ${scrapedCards.length}`);
    }
  }

  console.log(`\n=== TOTAL PRODUCTOS SCRAPEADOS DE STAR COMPANY: ${scrapedCards.length} ===\n`);

  // 5. Procesar cada producto scraped
  const stats = {
    totalScraped: scrapedCards.length,
    linkedToExistingProduct: 0,
    cheaperSwappedToStar: 0,
    keptExistingCheaper: 0,
    outOfStockFallenBack: 0,
    newOpportunitiesRegistered: 0,
    offersUpserted: 0,
    productUpdates: 0,
    errors: 0
  };

  const now = new Date().toISOString();
  const offersToUpsert: any[] = [];
  const productUpdateQueue: Array<{ id: string; updates: Record<string, unknown> }> = [];

  for (const item of scrapedCards) {
    try {
      const cleanTitle = formatCommercialTitle(item.title);
      const brand = extractBrand(cleanTitle, item.brand);
      const detectedCat = detectStoreCategory(cleanTitle, categories, brand);

      // Chequear si el producto ya existe en el catálogo de MYA
      let matchedProduct: ProductItem | null = null;

      // 1. Chequear si la oferta ya estaba vinculada
      const existingStarOffer = starOffersByExtId.get(item.externalId);
      if (existingStarOffer?.product_id && productsById.has(existingStarOffer.product_id)) {
        matchedProduct = productsById.get(existingStarOffer.product_id)!;
      }

      // 2. Chequear por source_url que contenga la URL de Star Company con el externalId
      if (!matchedProduct) {
        matchedProduct = allProducts.find((p) =>
          p.source_url && (
            p.source_url.includes(`/${item.externalId}-`) ||
            p.source_url.endsWith(`/${item.externalId}`) ||
            p.source_url.includes(`id_product=${item.externalId}`)
          )
        ) || null;
      }

      // 3. Chequear por coincidencia difusa de título y marca
      if (!matchedProduct) {
        const normClean = normalizeText(cleanTitle);
        matchedProduct = allProducts.find((p) => {
          const normP = normalizeText(p.title);
          if (normClean === normP) return true;

          // Marca y volumen coinciden exactamente
          if (brand.length > 3 && normP.includes(brand.toLowerCase()) && normClean.includes(brand.toLowerCase())) {
            const volClean = cleanTitle.match(/(\d+)\s*ml/i)?.[1];
            const volP = p.title.match(/(\d+)\s*ml/i)?.[1];
            if (volClean && volP && volClean === volP) {
              const coreWords = normClean.split(" ").filter((w) => w.length > 3);
              const matches = coreWords.filter((w) => normP.includes(w)).length;
              if (matches >= 3 && matches >= coreWords.length * 0.7) {
                return true;
              }
            }
          }
          return false;
        }) || null;
      }

      // Decisión Multi-Proveedor
      let finalProductId: string | null = null;

      if (matchedProduct) {
        finalProductId = matchedProduct.id;
        stats.linkedToExistingProduct++;

        // Consultar otras ofertas existentes para este producto (ej. Atacado USA)
        const siblingOffers = (offersByProductId.get(matchedProduct.id) || []).filter(
          (o) => o.supplier_id !== STAR_SUPPLIER_ID
        );

        const starLandedCost = Math.round(item.priceUsd * FX_RATE * PASERO_RATE);
        let starIsCheapestAndAvailable = false;

        if (siblingOffers.length === 0) {
          // No hay otro proveedor: Star Company es el proveedor principal
          starIsCheapestAndAvailable = true;
        } else {
          // Comparar con el proveedor alternativo
          const altOffer = siblingOffers[0];
          const altInStock = altOffer.availability === "in_stock";
          const altCost = Number(altOffer.origin_cost) || 999999;

          if (!altInStock && item.isAvailable) {
            // El otro proveedor se quedó sin stock -> Star Company entra como rescate/fallback
            starIsCheapestAndAvailable = true;
            stats.outOfStockFallenBack++;
            console.log(`[FALLBACK ACTIVADO] "${matchedProduct.title}" -> Proveedor alternativo sin stock, Star Company toma el relevo ($${item.priceUsd} USD)`);
          } else if (item.isAvailable && item.priceUsd <= altCost) {
            // Star Company está disponible y es igual o más barato
            starIsCheapestAndAvailable = true;
            stats.cheaperSwappedToStar++;
            console.log(`[MEJOR PRECIO STAR] "${matchedProduct.title}": Star USD ${item.priceUsd} <= Alt USD ${altCost}`);
          } else {
            // El otro proveedor es más barato y está en stock
            stats.keptExistingCheaper++;
          }
        }

        // Actualizar datos del producto si Star Company es el seleccionado o si el producto necesita datos
        if (starIsCheapestAndAvailable) {
          const updates: Record<string, unknown> = {
            source_url: item.productUrl,
            supplier_available: item.isAvailable,
            supplier_stock_status: item.isAvailable ? "in_stock" : "out_of_stock",
            supplier_live_price: starLandedCost,
            supplier_last_checked_at: now,
            updated_at: now
          };

          // Si el producto no tiene foto de alta calidad, actualizarla
          if (!matchedProduct.image_url || matchedProduct.image_url.includes("placeholder") || !matchedProduct.image_url.startsWith("http")) {
            updates.image_url = item.imageUrl;
            updates.image_urls = [item.imageUrl];
          }

          productUpdateQueue.push({ id: matchedProduct.id, updates });
        }
      } else {
        // NO está en MYA -> OPORTUNIDAD NUEVA PARA EL RADAR (/admin/oportunidades)
        finalProductId = null;
        stats.newOpportunitiesRegistered++;
      }

      // Preparar registro para supplier_offers
      offersToUpsert.push({
        supplier_id: STAR_SUPPLIER_ID,
        product_id: finalProductId,
        variant_id: null,
        external_id: item.externalId,
        variant_key: "attribute:0",
        title: item.title,
        brand: brand || "",
        model: item.externalId,
        gtin: null,
        source_url: item.productUrl,
        origin_cost: item.priceUsd,
        currency: "USD",
        availability: item.isAvailable ? "in_stock" : "out_of_stock",
        verification: "verified",
        cost_checked_at: now,
        availability_checked_at: now,
        last_success_at: now,
        last_error: null,
        updated_at: now,
        evidence: {
          costScope: "origin",
          sourceTitle: item.title,
          category: item.categorySlug,
          stockQty: item.stockQty,
          imageUrl: item.imageUrl,
          availabilityBasis: "explicit"
        }
      });

    } catch (err: any) {
      stats.errors++;
      console.error(`[ERROR PROCESANDO ${item.externalId}]:`, err.message);
    }
  }

  // 6. Ejecutar actualizaciones masivas de productos en chunks de 50
  console.log(`\n--- Aplicando actualizaciones a ${productUpdateQueue.length} productos coincidentes ---`);
  for (let i = 0; i < productUpdateQueue.length; i += 50) {
    const chunk = productUpdateQueue.slice(i, i + 50);
    await Promise.all(
      chunk.map(async (u) => {
        const { error } = await supabase.from("products").update(u.updates).eq("id", u.id);
        if (error) {
          console.error(`[ERROR UPDATE PRODUCT ${u.id}]:`, error.message);
          stats.errors++;
        } else {
          stats.productUpdates++;
        }
      })
    );
  }

  // 7. Upsert de supplier_offers en lotes de 100
  console.log(`\n--- Guardando ${offersToUpsert.length} ofertas en supplier_offers (onConflict: supplier_id, external_id, variant_key) ---`);
  for (let i = 0; i < offersToUpsert.length; i += 100) {
    const chunk = offersToUpsert.slice(i, i + 100);
    const { error } = await supabase
      .from("supplier_offers")
      .upsert(chunk, { onConflict: "supplier_id,external_id,variant_key" });
    if (error) {
      console.error(`[ERROR UPSERT OFFERS ${i}-${i + chunk.length}]:`, error.message);
      stats.errors++;
    } else {
      stats.offersUpserted += chunk.length;
    }
    if ((i + 100) % 500 === 0 || i + 100 >= offersToUpsert.length) {
      console.log(`[UPSERT OFFERS] ${Math.min(i + 100, offersToUpsert.length)} / ${offersToUpsert.length} completados`);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log("\n========================================================");
  console.log("=== SINCRONIZACIÓN STAR COMPANY FINALIZADA CON ÉXITO ===");
  console.log("========================================================");
  console.log(`Tiempo total: ${durationSec}s`);
  console.log(`Total productos scrapeados: ${stats.totalScraped}`);
  console.log(`Vinculados a productos existentes: ${stats.linkedToExistingProduct}`);
  console.log(`- Cambiados a Star Company (más barato): ${stats.cheaperSwappedToStar}`);
  console.log(`- Conservados con proveedor alternativo (más barato): ${stats.keptExistingCheaper}`);
  console.log(`- Fallback activado (otro proveedor agotado): ${stats.outOfStockFallenBack}`);
  console.log(`Nuevas oportunidades en Radar (/admin/oportunidades): ${stats.newOpportunitiesRegistered}`);
  console.log(`Total ofertas guardadas/actualizadas: ${stats.offersUpserted}`);
  console.log(`Productos actualizados en vivo: ${stats.productUpdates}`);
  console.log(`Errores: ${stats.errors}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR EN SINCRONIZACIÓN:", err);
  process.exit(1);
});

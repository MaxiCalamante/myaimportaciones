import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { cleanWholesaleTitle, detectStoreCategory, buildRichProductDescription, type CategoryInfo } from "../src/lib/supplier-opportunities";
import { slugifyProduct } from "../src/lib/admin-product";

// 1. Read environment variables from .env.local
const envContent = readFileSync(".env.local", "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]);
const ATACADO_SUPPLIER_ID = "c646bd67-0928-4dda-8fe1-0136fa941464";

interface ScrapedCard {
  externalId: string;
  title: string;
  priceUsd: number;
  imageUrl: string;
  productUrl: string;
  rawBrand?: string;
}

// 2. Format title cleanly
export function formatCommercialTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle.trim();

  // Remove trailing internal codes like (030548)
  clean = clean.replace(/\s*\(\d+\)\s*$/g, "");

  // Remove SKU / REF / COD
  clean = clean.replace(/\b(?:SKU|COD|REF|ID):\s*[A-Z0-9-]+\b/gi, "");

  // Normalize Portuguese terms to Spanish
  clean = clean.replace(/\bMASCULINO\b/gi, "Masculino");
  clean = clean.replace(/\bFEMENINO\b|\bFEMININO\b/gi, "Femenino");
  clean = clean.replace(/\bUNISSEX\b|\bUNISEX\b/gi, "Unisex");
  clean = clean.replace(/\bOLEO\b/gi, "Aceite");
  clean = clean.replace(/\bCREME\b/gi, "Crema");

  // Normalize prefixes
  clean = clean.replace(/^PERFUME\s+/i, "Perfume ");
  clean = clean.replace(/^KIT\s+/i, "Kit ");

  // Apply supplier opportunities cleaning
  clean = cleanWholesaleTitle(clean);

  // Capitalize prefixes properly
  clean = clean.replace(/^PERFUME\b/i, "Perfume");
  clean = clean.replace(/^KIT\b/i, "Kit");

  // Normalize units
  clean = clean.replace(/(\d+)\s*ML\b/gi, "$1 ml");
  clean = clean.replace(/(\d+)\s*G\b/gi, "$1 g");

  return clean.replace(/\s{2,}/g, " ").trim();
}

// 3. Extract brand from title
const KNOWN_BRANDS = [
  "Maison Alhambra", "Lattafa", "Karseell", "Afnan", "Armaf", "Al Haramain",
  "Fragrance World", "Orientica", "Medicube", "SKIN1004", "Skin1004", "Anua",
  "Celimax", "Dr. Althea", "Torriden", "Round Lab", "Cosrx", "Kérastase",
  "Kerastase", "Shiseido", "Tree Hut", "Bath & Body Works", "Victoria's Secret",
  "Dior", "Chanel", "Carolina Herrera", "Paco Rabanne", "Versace", "Calvin Klein",
  "Giorgio Armani", "Yves Saint Laurent", "Lancôme", "Montblanc", "Hugo Boss",
  "Jean Paul Gaultier", "Dolce & Gabbana", "Burberry", "Bvlgari", "Azzaro",
  "Moschino", "Givenchy", "Gucci", "Prada", "Rabanne", "Joop", "Nautica"
];

function extractBrand(title: string): string {
  for (const b of KNOWN_BRANDS) {
    const reg = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (reg.test(title)) return b;
  }
  // Fallback: remove generic prefix and take first word
  const stripped = title.replace(/^(?:Perfume|Kit|Crema|Aceite|Serum|Mascara)\s+/i, "").trim();
  const words = stripped.split(/\s+/);
  return words[0] || "General";
}

// 4. Fetch & parse a category page
async function fetchCategoryPage(category: "cosmeticos" | "perfumes", page: number): Promise<ScrapedCard[]> {
  const url = `https://atacadousa.com.py/categoria/${category}?p=${page}`;
  console.log(`[SCRAPER] Fetching ${category} p=${page} -> ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,pt-BR;q=0.8,pt;q=0.7,en;q=0.6"
    }
  });

  if (!res.ok) {
    console.error(`[SCRAPER] HTTP error ${res.status} for ${url}`);
    return [];
  }

  const html = await res.text();
  const cardRegex = /<article class="av-product-card">([\s\S]*?)<\/article>/gi;
  const matches = [...html.matchAll(cardRegex)];
  const items: ScrapedCard[] = [];

  for (const m of matches) {
    const cardHtml = m[1];

    // External ID
    const refMatch = cardHtml.match(/data-av-ref=["'](\d+)["']/i) 
      || cardHtml.match(/data-av-id=["'](\d+)["']/i)
      || cardHtml.match(/<small>Ref\.\s*(\d+)<\/small>/i)
      || cardHtml.match(/\/produto\/(\d+)/i);
    const externalId = refMatch ? refMatch[1] : null;

    // Title
    const titleMatch = cardHtml.match(/data-av-name=["']([^"']+)["']/i)
      || cardHtml.match(/<h3><a[^>]*>([\s\S]*?)<\/a><\/h3>/i)
      || cardHtml.match(/aria-label=["']Ver ([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // Price USD
    const priceMatch = cardHtml.match(/data-av-price=["']([^"']+)["']/i)
      || cardHtml.match(/class=["']av-price["']>([^<]+)</i);
    let priceUsd = 0;
    if (priceMatch) {
      const cleanPrice = priceMatch[1].replace(/[^\d.,]/g, "").replace(",", ".");
      priceUsd = parseFloat(cleanPrice) || 0;
    }

    // Image URL
    const imgMatch = cardHtml.match(/data-av-image=["']([^"']+)["']/i)
      || cardHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    let imageUrl = imgMatch ? imgMatch[1] : "";
    if (imageUrl) {
      // Upgrade to high-resolution large_default
      imageUrl = imageUrl.replace("/home_default/", "/large_default/").replace("-home_default", "-large_default");
    }

    // Product URL
    const productUrl = externalId ? `https://atacadousa.com.py/produto/${externalId}` : "";

    // Brand
    const brandMatch = cardHtml.match(/data-av-brand=["']([^"']+)["']/i);
    const rawBrand = brandMatch ? brandMatch[1].trim() : undefined;

    if (externalId && title && priceUsd > 0) {
      items.push({
        externalId,
        title,
        priceUsd,
        imageUrl,
        productUrl,
        rawBrand
      });
    }
  }

  return items;
}

// 5. Normalizer for fuzzy matching
function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("=== INICIANDO SINCRONIZACIÓN Y CARGA DE ATACADO USA ===");
  console.log("Objetivo: Cosméticos (p=1..13) y Perfumes (p=1..34)");

  // Load categories
  const { data: dbCategories, error: catErr } = await supabase.from("categories").select("*");
  if (catErr || !dbCategories) {
    throw new Error(`Error cargando categorías: ${catErr?.message}`);
  }
  const categories: CategoryInfo[] = dbCategories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    imageUrl: c.image_url
  }));
  console.log(`Cargadas ${categories.length} categorías de la tienda.`);

  // Load existing products (non-deleted)
  const { data: dbProducts, error: prodErr } = await supabase
    .from("products")
    .select("id,title,slug,brand,model,sku,source_url,category_id,retail_price,wholesale_price,wholesale_min_qty,image_url,image_urls,is_active")
    .is("deleted_at", null);
  if (prodErr || !dbProducts) {
    throw new Error(`Error cargando productos existentes: ${prodErr?.message}`);
  }
  const allProducts = dbProducts || [];
  console.log(`Cargados ${allProducts.length} productos activos en el catálogo de MYA.`);

  // Load existing supplier offers for Atacado USA
  const { data: dbOffers, error: offErr } = await supabase
    .from("supplier_offers")
    .select("id,product_id,external_id,source_url,origin_cost,availability")
    .eq("supplier_id", ATACADO_SUPPLIER_ID);
  if (offErr) {
    throw new Error(`Error cargando ofertas de Atacado USA: ${offErr.message}`);
  }
  const allOffers = dbOffers || [];
  console.log(`Cargadas ${allOffers.length} ofertas existentes de Atacado USA.`);

  // Create fast lookup maps
  type ProductItem = typeof allProducts[number];
  type OfferItem = typeof allOffers[number];

  const offersByExternalId = new Map<string, OfferItem>();
  for (const o of allOffers) {
    if (o.external_id) offersByExternalId.set(String(o.external_id), o);
  }

  const productsById = new Map<string, ProductItem>();
  for (const p of allProducts) {
    productsById.set(p.id, p);
  }

  // Set of processed externalIds to avoid duplicate processing in the same run
  const processedExternalIds = new Set<string>();

  // Statistics
  const stats = {
    cosmeticosScraped: 0,
    perfumesScraped: 0,
    existingLinkedOrUpdated: 0,
    newProductsCreated: 0,
    offersUpserted: 0,
    errors: 0
  };

  // Helper function to process a single item
  async function processItem(item: ScrapedCard, categorySlug: "cosmeticos" | "perfumes") {
    if (processedExternalIds.has(item.externalId)) return;
    processedExternalIds.add(item.externalId);

    try {
      const cleanTitle = formatCommercialTitle(item.title);
      const brand = extractBrand(cleanTitle) || item.rawBrand || "General";
      const detectedCat = detectStoreCategory(cleanTitle, categories, brand);

      // Safe category resolution with explicit fallbacks
      let categoryId = detectedCat.categoryId;
      let categorySlugName = detectedCat.categorySlug;
      let categoryName = detectedCat.categoryName;

      if (!categoryId) {
        if (categorySlug === "perfumes") {
          if (/mist|splash|bruma/i.test(cleanTitle)) {
            const mistCat = categories.find(c => c.slug === "body-mists-brumas") || categories.find(c => c.slug === "perfumeria");
            categoryId = mistCat?.id || "10000000-0000-0000-0000-000000000072";
            categorySlugName = mistCat?.slug || "body-mists-brumas";
            categoryName = mistCat?.name || "Body mists y brumas";
          } else if (/\b(?:lattafa|asdaf|yara|khamrah|bade'e|asad|qaed|fakhar|orientica|al haramain|afnan)\b/i.test(cleanTitle)) {
            const arabCat = categories.find(c => c.slug === "perfumes-arabes") || categories.find(c => c.slug === "perfumeria");
            categoryId = arabCat?.id || "10000000-0000-0000-0000-000000000071";
            categorySlugName = arabCat?.slug || "perfumes-arabes";
            categoryName = arabCat?.name || "Perfumes árabes";
          } else {
            const perfCat = categories.find(c => c.slug === "perfumeria");
            categoryId = perfCat?.id || "20000000-0000-0000-0000-000000000005";
            categorySlugName = perfCat?.slug || "perfumeria";
            categoryName = perfCat?.name || "Perfumería";
          }
        } else {
          const cosCat = categories.find(c => c.slug === "cosmetica-coreana");
          categoryId = cosCat?.id || "10000000-0000-0000-0000-000000000001";
          categorySlugName = cosCat?.slug || "cosmetica-coreana";
          categoryName = cosCat?.name || "Cosmética facial y corporal";
        }
      }

      // Financial pricing:
      // Landed cost = Costo USD * 1550 (cambio compra) * 1.20 (pasero)
      const landedCost = item.priceUsd * 1550 * 1.20;

      let retailPrice = 0;
      let wholesalePrice = 0;
      let wholesaleMinQty = 4;

      if (categorySlug === "perfumes") {
        wholesaleMinQty = 3;
        // Retail markup ~2.05x landed
        retailPrice = Math.round((landedCost * 2.05) / 100) * 100;
        if (retailPrice % 1000 === 0) retailPrice -= 100; // e.g. 59900

        // Wholesale markup ~1.55x landed
        wholesalePrice = Math.round((landedCost * 1.55) / 100) * 100;
        if (wholesalePrice % 1000 === 0) wholesalePrice -= 100; // e.g. 44900
      } else {
        wholesaleMinQty = 4;
        // Cosmetics retail markup ~1.85x landed
        retailPrice = Math.round((landedCost * 1.85) / 100) * 100;
        if (retailPrice % 1000 === 0) retailPrice -= 100; // e.g. 35900

        // Cosmetics wholesale markup ~1.45x landed
        wholesalePrice = Math.round((landedCost * 1.45) / 100) * 100;
        if (wholesalePrice % 1000 === 0) wholesalePrice -= 100; // e.g. 26500
      }

      // Check if product already exists in MYA catalog
      let matchedProduct: ProductItem | null = null;

      // 1. Check via existing supplier offer
      const existingOffer = offersByExternalId.get(item.externalId);
      if (existingOffer?.product_id && productsById.has(existingOffer.product_id)) {
        matchedProduct = productsById.get(existingOffer.product_id)!;
      }

      // 2. Check via products.source_url containing the externalId
      if (!matchedProduct) {
        matchedProduct = allProducts.find(p => 
          p.source_url && (
            p.source_url.includes(`/${item.externalId}-`) || 
            p.source_url.endsWith(`/${item.externalId}`) ||
            p.source_url.includes(`/produto/${item.externalId}`)
          )
        ) || null;
      }

      // 3. Check via normalized title match
      if (!matchedProduct) {
        const normClean = normalizeText(cleanTitle);
        matchedProduct = allProducts.find(p => {
          const normP = normalizeText(p.title);
          if (normClean === normP) return true;
          // Check if both have same brand and same volume and similar title
          if (brand.length > 3 && normP.includes(brand.toLowerCase()) && normClean.includes(brand.toLowerCase())) {
            // Check volume match (e.g. 100 ml or 50 ml)
            const volClean = cleanTitle.match(/(\d+)\s*ml/i)?.[1];
            const volP = p.title.match(/(\d+)\s*ml/i)?.[1];
            if (volClean && volP && volClean === volP) {
              const coreWords = normClean.split(" ").filter(w => w.length > 3);
              const matches = coreWords.filter(w => normP.includes(w)).length;
              if (matches >= 3 && matches >= coreWords.length * 0.7) {
                return true;
              }
            }
          }
          return false;
        }) || null;
      }

      const now = new Date().toISOString();

      if (matchedProduct) {
        // --- CASE 1: EXISTING PRODUCT IN MYA ---
        // Update product to ensure working supplier link, stock status, high-res image, and freshness
        const productUpdates: Record<string, unknown> = {
          source_url: item.productUrl, // Fresh live link to https://atacadousa.com.py/produto/{id}
          supplier_available: true,
          supplier_stock_status: "in_stock",
          supplier_last_checked_at: now,
          updated_at: now
        };

        // If product has missing or placeholder image, upgrade to high-res image
        if (!matchedProduct.image_url || matchedProduct.image_url.includes("placeholder") || !matchedProduct.image_url.startsWith("http")) {
          productUpdates.image_url = item.imageUrl;
          productUpdates.image_urls = [item.imageUrl];
        }

        // If prices are 0, calibrate them
        if (!matchedProduct.retail_price || matchedProduct.retail_price === 0) {
          productUpdates.retail_price = retailPrice;
        }
        if (!matchedProduct.wholesale_price || matchedProduct.wholesale_price === 0) {
          productUpdates.wholesale_price = wholesalePrice;
          productUpdates.wholesale_min_qty = wholesaleMinQty;
        }

        const { error: updErr } = await supabase
          .from("products")
          .update(productUpdates)
          .eq("id", matchedProduct.id);

        if (updErr) {
          console.error(`[ERROR UPDATING PRODUCT ${matchedProduct.id}]:`, updErr.message);
          stats.errors++;
        } else {
          stats.existingLinkedOrUpdated++;
        }

        // Upsert / Link supplier_offers record
        if (existingOffer) {
          await supabase
            .from("supplier_offers")
            .update({
              product_id: matchedProduct.id,
              origin_cost: item.priceUsd,
              source_url: item.productUrl,
              availability: "in_stock",
              verification: "verified",
              cost_checked_at: now,
              availability_checked_at: now,
              last_success_at: now,
              updated_at: now
            })
            .eq("id", existingOffer.id);
        } else {
          await supabase
            .from("supplier_offers")
            .insert({
              supplier_id: ATACADO_SUPPLIER_ID,
              product_id: matchedProduct.id,
              external_id: item.externalId,
              variant_key: `listing:${item.externalId}`,
              title: item.title,
              brand,
              model: item.externalId,
              source_url: item.productUrl,
              origin_cost: item.priceUsd,
              currency: "USD",
              availability: "in_stock",
              verification: "verified",
              cost_checked_at: now,
              availability_checked_at: now,
              last_success_at: now,
              created_at: now,
              updated_at: now,
              evidence: {
                matchedBy: "category_ingestion_link",
                sourceTitle: item.title,
                category: categorySlug
              }
            });
        }
        stats.offersUpserted++;
        console.log(`[LINKED] ${item.title} -> "${matchedProduct.title}" (URL: ${item.productUrl})`);

      } else {
        // --- CASE 2: NEW PRODUCT TO ADD TO MYA ---
        const newProductId = crypto.randomUUID();
        const baseSlug = slugifyProduct(cleanTitle);
        const slug = `${baseSlug}-${item.externalId}`;

        const description = buildRichProductDescription({
          title: cleanTitle,
          brand,
          model: item.externalId,
          categoryName: categoryName,
          categorySlug: categorySlugName
        });

        const newProduct = {
          id: newProductId,
          title: cleanTitle,
          slug,
          description,
          category_id: categoryId,
          image_url: item.imageUrl,
          image_urls: [item.imageUrl],
          retail_price: retailPrice,
          wholesale_price: wholesalePrice,
          wholesale_min_qty: wholesaleMinQty,
          stock: 0, // Separado de stock físico Tandil
          payment_methods: ["transferencia"],
          tags: [brand, categorySlugName, "atacado-usa"].filter(Boolean),
          is_active: true,
          is_featured: false,
          is_wholesale_only: false,
          brand,
          model: item.externalId,
          sku: `MYA-USA-${item.externalId}`,
          fulfillment_mode: "supplier",
          supplier_available: true,
          supplier_stock_status: "in_stock",
          supplier_last_checked_at: now,
          source_url: item.productUrl,
          specifications: {
            "Marca": brand,
            "Presentación": cleanTitle,
            "Referencia": item.externalId
          },
          has_variants: false,
          options_config: [],
          created_at: now,
          updated_at: now
        };

        const { error: insErr } = await supabase.from("products").insert(newProduct);
        if (insErr) {
          console.error(`[ERROR INSERTING PRODUCT ${cleanTitle}]:`, insErr.message);
          stats.errors++;
          return;
        }

        // Add to local cache so subsequent items don't duplicate
        productsById.set(newProductId, newProduct);
        stats.newProductsCreated++;

        // Insert supplier offer
        if (existingOffer) {
          await supabase
            .from("supplier_offers")
            .update({
              product_id: newProductId,
              origin_cost: item.priceUsd,
              source_url: item.productUrl,
              availability: "in_stock",
              verification: "verified",
              cost_checked_at: now,
              availability_checked_at: now,
              last_success_at: now,
              updated_at: now
            })
            .eq("id", existingOffer.id);
        } else {
          await supabase
            .from("supplier_offers")
            .insert({
              supplier_id: ATACADO_SUPPLIER_ID,
              product_id: newProductId,
              external_id: item.externalId,
              variant_key: `listing:${item.externalId}`,
              title: item.title,
              brand,
              model: item.externalId,
              source_url: item.productUrl,
              origin_cost: item.priceUsd,
              currency: "USD",
              availability: "in_stock",
              verification: "verified",
              cost_checked_at: now,
              availability_checked_at: now,
              last_success_at: now,
              created_at: now,
              updated_at: now,
              evidence: {
                matchedBy: "category_ingestion_new",
                sourceTitle: item.title,
                category: categorySlug
              }
            });
        }
        stats.offersUpserted++;
        console.log(`[CREATED] "${cleanTitle}" ($${item.priceUsd} USD -> Retail: $${retailPrice} ARS | Mayorista: $${wholesalePrice} ARS)`);
      }
    } catch (err) {
      console.error(`[EXCEPTION on item ${item.externalId}]:`, err instanceof Error ? err.message : String(err));
      stats.errors++;
    }
  }

  // --- 1. PROCESAR COSMÉTICOS (PÁGINAS 1 A 13) ---
  console.log("\n=======================================================");
  console.log(">>> ETAPA 1: RECORRIDO DE COSMÉTICOS (Páginas 1 a 13)");
  console.log("=======================================================");

  for (let p = 1; p <= 13; p++) {
    const items = await fetchCategoryPage("cosmeticos", p);
    stats.cosmeticosScraped += items.length;
    console.log(`[COSMÉTICOS] Página ${p}/13: ${items.length} productos obtenidos.`);

    for (const item of items) {
      await processItem(item, "cosmeticos");
    }

    // Delay between pages
    await new Promise(r => setTimeout(r, 600));
  }

  // --- 2. PROCESAR PERFUMES (PÁGINAS 1 A 34) ---
  console.log("\n=======================================================");
  console.log(">>> ETAPA 2: RECORRIDO DE PERFUMES (Páginas 1 a 34)");
  console.log("=======================================================");

  for (let p = 1; p <= 34; p++) {
    const items = await fetchCategoryPage("perfumes", p);
    stats.perfumesScraped += items.length;
    console.log(`[PERFUMES] Página ${p}/34: ${items.length} productos obtenidos.`);

    for (const item of items) {
      await processItem(item, "perfumes");
    }

    // Delay between pages
    await new Promise(r => setTimeout(r, 600));
  }

  console.log("\n=======================================================");
  console.log(">>> RESUMEN FINAL DE LA OPERACIÓN");
  console.log("=======================================================");
  console.log(`Total productos escaneados en Cosméticos: ${stats.cosmeticosScraped}`);
  console.log(`Total productos escaneados en Perfumes:   ${stats.perfumesScraped}`);
  console.log(`Total productos existentes vinculados/actualizados: ${stats.existingLinkedOrUpdated}`);
  console.log(`Total nuevos productos agregados al catálogo:       ${stats.newProductsCreated}`);
  console.log(`Total ofertas de proveedor sincronizadas:          ${stats.offersUpserted}`);
  console.log(`Errores encontrados:                              ${stats.errors}`);
  console.log("=======================================================\n");
}

main().catch(err => {
  console.error("FATAL ERROR IN SCRIPT:", err);
  process.exit(1);
});

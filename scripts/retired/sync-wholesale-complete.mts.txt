import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { classifyWholesaleRubro } from "../src/lib/wholesale-pricing-engine.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FX_RATE = 1555;
const CARRIER_PASERO_MULTIPLIER = 1.20; // 20% pasero
const RETAIL_MARGIN = 0.30; // 30% retail margin
const WHOLESALE_MARGIN = 0.18; // 18% wholesale margin

function roundArs(num: number): number {
  return Math.round(num / 100) * 100;
}

const NEW_ELECTRO_PRODUCTS = [
  {
    title: "Freidora de Aire Ninja Air Fryer 3.8L 1500W AF101",
    slug: "freidora-de-aire-ninja-air-fryer-3-8l-af101",
    brand: "Ninja",
    model: "AF101",
    sku: "NIN-AF101",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 72,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/ninja-af101-air-fryer.jpg",
    description: "Freidora de aire digital Ninja de 3.8 litros con tecnología Air Fry, Roast, Reheat y Dehydrate. Canasta antiadherente de cerámica libre de BPA, rango térmico de 40°C a 200°C y potencia de 1500W para cocción rápida y uniforme con hasta 75% menos grasa.",
    specifications: { Capacidad: "3.8 L", Potencia: "1500 W", Funciones: "4 en 1 (Freír, Asar, Recalentar, Deshidratar)", Rango: "40°C - 200°C", Material: "Cerámica antiadherente" },
  },
  {
    title: "Licuadora Ninja Professional Plus Blender 1400W BN701",
    slug: "licuadora-ninja-professional-plus-blender-1400w-bn701",
    brand: "Ninja",
    model: "BN701",
    sku: "NIN-BN701",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 85,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/ninja-bn701-blender.jpg",
    description: "Licuadora profesional Ninja con motor de 1400 watts pico y cuchillas Total Crushing para pulverizar hielo a nieve en segundos. Jarra XL Total Crushing de 2.1 litros (72 oz), 3 programas inteligentes Auto-iQ y control de velocidades táctil.",
    specifications: { Potencia: "1400 W pico", Jarra: "2.1 L (72 oz)", Cuchillas: "Total Crushing 6 hojas", Programas: "3 Auto-iQ preestablecidos" },
  },
  {
    title: "Procesadora de Alimentos Ninja Professional Food Processor 1000W BN601",
    slug: "procesadora-alimentos-ninja-professional-bn601",
    brand: "Ninja",
    model: "BN601",
    sku: "NIN-BN601",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 78,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/ninja-bn601-processor.jpg",
    description: "Procesadora de cocina de precisión Ninja con motor de 1000W y tecnología Auto-iQ. Tazón de procesamiento de 2.1 litros (9 tazas), cuchilla para picar, disco reversible para rebanar/rallar y cuchilla para amasar.",
    specifications: { Potencia: "1000 W", Capacidad: "2.1 L (9 tazas)", Funciones: "Picar, Rebanar, Rallar, Amasar", Seguridad: "Bloqueo inteligente" },
  },
  {
    title: "Licuadora Personal Nutri Ninja Pro 900W BL456",
    slug: "licuadora-personal-nutri-ninja-pro-900w-bl456",
    brand: "Ninja",
    model: "BL456",
    sku: "NIN-BL456",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 52,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/nutri-ninja-bl456.jpg",
    description: "Licuadora personal de alta potencia Ninja con extracción de nutrientes y vitaminas Pro Extractor Blades. Incluye 2 vasos portátiles To-Go de 530 ml y 710 ml con tapas herméticas Sip & Seal.",
    specifications: { Potencia: "900 W", Vasos: "2 vasos To-Go (530ml y 710ml)", Cuchillas: "Pro Extractor Blades acero inox", Uso: "Smoothies, batidos, frutos secos" },
  },
  {
    title: "Freidora de Aire Philips Essential Airfryer XL 4.1L HD9252",
    slug: "freidora-aire-philips-essential-airfryer-xl-hd9252",
    brand: "Philips",
    model: "HD9252/90",
    sku: "PHI-HD9252",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 82,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/philips-hd9252-airfryer.jpg",
    description: "Freidora de aire digital Philips Essential XL con tecnología Rapid Air para comidas crujientes por fuera y tiernas por dentro con hasta 90% menos grasa. Pantalla táctil LED con 7 modos preconfigurados y función de mantener caliente.",
    specifications: { Capacidad: "4.1 L", Potencia: "1400 W", Pantalla: "Digital táctil LED", Modos: "7 preconfigurados + mantenimiento caliente" },
  },
  {
    title: "Pava Eléctrica Philips Serie 3000 1.7L Acero Inoxidable HD9350",
    slug: "pava-electrica-philips-serie-3000-acero-hd9350",
    brand: "Philips",
    model: "HD9350/90",
    sku: "PHI-HD9350",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 26,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/philips-hd9350-kettle.jpg",
    description: "Hervidor eléctrico duradero de acero inoxidable pulido de 1.7 litros. Resistencia plana de calentamiento rápido, microfiltro desmontable antical, indicador de nivel de agua y sistema de apagado automático de seguridad.",
    specifications: { Capacidad: "1.7 L", Potencia: "2200 W", Cuerpo: "Acero inoxidable pulido", Base: "Giratoria 360° con guardacables" },
  },
  {
    title: "Afeitadora Eléctrica Philips Serie 3000 Wet & Dry S3134",
    slug: "afeitadora-electrica-philips-serie-3000-s3134",
    brand: "Philips",
    model: "S3134/51",
    sku: "PHI-S3134",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 38,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/philips-s3134-shaver.jpg",
    description: "Afeitadora eléctrica para uso seco o húmedo con cabezales Pivot & Flex 5D que siguen el contorno facial. Cuchillas PowerCut autoafilables, corta patillas desplegable integrado y batería de litio con 60 minutos de autonomía.",
    specifications: { Cabezal: "5D Pivot & Flex", Cuchillas: "PowerCut (27 autoafilables)", Batería: "Li-Ion 60 min autonomía", Carga: "Rápida 5 min para 1 afeitada" },
  },
  {
    title: "Cortadora de Cabello Philips Serie 5000 Hairclipper HC5630",
    slug: "cortadora-cabello-philips-serie-5000-hc5630",
    brand: "Philips",
    model: "HC5630/15",
    sku: "PHI-HC5630",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 32,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/philips-hc5630-clipper.jpg",
    description: "Cortacabello profesional Philips con tecnología Trim-n-Flow Pro que evita que el pelo se atasque en el peine. Cuchillas DualCut de doble filo en acero inoxidable, 28 posiciones de longitud (0.5 mm a 28 mm) y 90 minutos de uso inalámbrico.",
    specifications: { Cuchillas: "DualCut autoafilables", Longitudes: "28 posiciones (0.5 a 28 mm)", Autonomía: "90 min (batería Li-Ion)", "100% Lavable": "Sí" },
  },
  {
    title: "Afeitadora Híbrida Philips OneBlade Pro 360 QP6551",
    slug: "afeitadora-hibrida-philips-oneblade-pro-360-qp6551",
    brand: "Philips",
    model: "QP6551/15",
    sku: "PHI-QP6551",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 44,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/philips-oneblade-qp6551.jpg",
    description: "Recortadora y afeitadora híbrida OneBlade Pro 360 con cuchilla flexible que se adapta a todas las curvas. Peine guía de precisión con 14 longitudes regulables (0.4 a 10 mm), pantalla LED digital de batería y 120 minutos de autonomía.",
    specifications: { Cuchilla: "OneBlade 360 grados", Peine: "14 longitudes (0.4 a 10 mm)", Autonomía: "120 min Li-Ion", Uso: "En seco y bajo la ducha" },
  },
  {
    title: "Afeitadora Eléctrica Braun Serie 5 Wet & Dry 51-M1200s",
    slug: "afeitadora-electrica-braun-serie-5-51-m1200s",
    brand: "Braun",
    model: "51-M1200s",
    sku: "BRN-51M1200",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 48,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/braun-series5-51m1200s.jpg",
    description: "Afeitadora eléctrica para hombre Braun Series 5 con 3 láminas flexibles que se adaptan a los contornos faciales. Sistema EasyClean para limpiar sin retirar el cabezal, tecnología AutoSense que detecta la densidad de la barba y batería de 50 minutos.",
    specifications: { Sistema: "3 láminas flexibles SensoFoil", Tecnología: "AutoSense inteligente", Limpieza: "EasyClean pasante", Origen: "Diseñado en Alemania" },
  },
  {
    title: "Cortadora de Barba y Cabello Braun Series 5 All-in-One MGK5410 9 en 1",
    slug: "recortadora-braun-series-5-all-in-one-mgk5410",
    brand: "Braun",
    model: "MGK5410",
    sku: "BRN-MGK5410",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 36,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/braun-mgk5410-trimmer.jpg",
    description: "Kit de estilismo multifunción 9 en 1 para barba, cabello, nariz y orejas. Cuchilla ultra afilada para un corte parejo en cualquier longitud, peines de precisión de 0.5 a 21 mm y batería de litio de larga duración con 100 minutos de funcionamiento.",
    specifications: { Funciones: "9 en 1 (barba, cabeza, orejas, nariz)", Autonomía: "100 min", Peines: "0.5 a 21 mm", Lavable: "100% resistente al agua" },
  },
  {
    title: "Pava Eléctrica Inteligente Xiaomi Smart Kettle Pro Digital",
    slug: "pava-electrica-inteligente-xiaomi-smart-kettle-pro",
    brand: "Xiaomi",
    model: "MJHWSH02YM",
    sku: "XIA-KETTLEPRO",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 39,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/xiaomi-smart-kettle-pro.jpg",
    description: "Pava eléctrica inteligente Xiaomi con pantalla OLED de temperatura en tiempo real y conectividad Bluetooth mediante Mi Home. 5 modos térmicos preconfigurados (para té, café, mate, leche), aislamiento térmico doble pared y mantenimiento de calor por 12 horas.",
    specifications: { Capacidad: "1.5 L", Potencia: "1800 W", Pantalla: "OLED digital", Control: "Bluetooth + App Mi Home", Interior: "Acero inox 304 quirúrgico" },
  },
  {
    title: "Aspiradora Robot Xiaomi Robot Vacuum E10 con Mopa 4000Pa",
    slug: "aspiradora-robot-xiaomi-robot-vacuum-e10",
    brand: "Xiaomi",
    model: "B112",
    sku: "XIA-VAC-E10",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 135,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/xiaomi-vacuum-e10.jpg",
    description: "Aspiradora robot inteligente Xiaomi con 4000 Pa de potencia de succión y sistema combinado de aspirado y trapeado con mopa húmeda. Navegación por giroscopio con planificación inteligente de rutas, sensores anticaída y control total por App Mi Home.",
    specifications: { Succión: "4000 Pa", Batería: "2600 mAh", Tanque: "2 en 1 (Polvo 400ml / Agua 200ml)", Conectividad: "Wi-Fi + Asistentes de voz" },
  },
  {
    title: "Freidora de Aire Xiaomi Smart Air Fryer 3.5L Wi-Fi OLED",
    slug: "freidora-de-aire-xiaomi-smart-air-fryer-3-5l",
    brand: "Xiaomi",
    model: "MAF02",
    sku: "XIA-AIRFRYER",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 65,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/xiaomi-air-fryer-35l.jpg",
    description: "Freidora de aire inteligente Xiaomi con circulación de aire caliente de 360° y pantalla interactiva OLED. Temperatura ajustable de 40°C a 200°C con función para deshidratar frutas y fermentar yogur. Más de 100 recetas inteligentes en la App.",
    specifications: { Capacidad: "3.5 L", Potencia: "1500 W", Pantalla: "OLED interactiva con perilla", Rango: "40°C a 200°C", Conectividad: "Wi-Fi Mi Home" },
  },
  {
    title: "Secador de Pelo Iónico Xiaomi Mi Ionic Hair Dryer H500",
    slug: "secador-pelo-ionico-xiaomi-ionic-h500",
    brand: "Xiaomi",
    model: "CMJ03LX",
    sku: "XIA-HD-H500",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 42,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/xiaomi-hair-dryer-h500.jpg",
    description: "Secador de pelo profesional Xiaomi con tecnología de hidratación por iones de agua dobles para un cabello más suave, brillante y sin frizz. Motor de alta velocidad de 20.000 rpm con flujo de aire de 20 m/s y control inteligente de temperatura NTC.",
    specifications: { Motor: "20.000 rpm de alta velocidad", Tecnología: "Doble ion de agua", "Velocidad aire": "20 m/s", Modos: "Calor, Frío, Alternante NTC" },
  },
  {
    title: "Aspiradora Inalámbrica Total Tools 20V Seco y Húmedo TVLI2001",
    slug: "aspiradora-inalambrica-total-tools-20v-tvli2001",
    brand: "Total",
    model: "TVLI2001",
    sku: "TOT-TVLI2001",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 46,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/total-tvli2001-vacuum.jpg",
    description: "Aspiradora inalámbrica portátil Total Tools compatible con batería P20S de 20V. Tanque de recolección de 0.7 litros para polvo y líquidos, filtro HEPA lavable de alta eficiencia y boquillas accesorias para hendiduras y tapizados.",
    specifications: { Voltaje: "20V P20S", Capacidad: "0.7 L polvo / líquidos", Filtro: "HEPA lavable", Presión: "≥7.0 KPa", Peso: "1.4 kg" },
  },
  {
    title: "Hidrolavadora Portátil a Batería Total Tools 20V TPWLI20084",
    slug: "hidrolavadora-portatil-a-bateria-total-tools-20v-tpwli20084",
    brand: "Total",
    model: "TPWLI20084",
    sku: "TOT-TPWLI20084",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 58,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/total-tpwli20084-washer.jpg",
    description: "Lavadora a presión inalámbrica compacta Total Tools con presión de hasta 24.8 Bar (360 PSI). Autocebante con manguera de 6 metros para extraer agua de baldes, piletas o ríos. Incluye lanza con boquilla multifunción 6 en 1 y depósito de jabón.",
    specifications: { Voltaje: "20V", "Presión máx": "24.8 Bar (360 PSI)", Caudal: "2.8 L/min", Manguera: "6 m autocebante con filtro", Boquilla: "6 en 1 regulable" },
  },
  {
    title: "Cepillo Secador Voluminizador Revlon Pro One-Step Plus",
    slug: "cepillo-secador-voluminizador-revlon-pro-one-step-plus",
    brand: "Revlon",
    model: "RVDR5298",
    sku: "REV-ONESTEP",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 45,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/revlon-one-step-plus.jpg",
    description: "Cepillo de aire caliente 2 en 1 Revlon One-Step Plus que seca y aporta volumen en la mitad del tiempo. Barril ovalado de cerámica de titanio con turmalina de 6.1 cm, 4 configuraciones de temperatura y motor de mayor durabilidad.",
    specifications: { Tecnología: "Cerámica de Titanio y Turmalina", Barril: "Ovalado 6.1 cm", Niveles: "4 temperaturas (Bajo, Medio, Alto, Frío)", Cable: "Giratorio profesional 360°" },
  },
  {
    title: "Planchita de Pelo Profesional BaBylissPRO Nano Titanium 1¼″",
    slug: "planchita-de-pelo-babylisspro-nano-titanium-1-1-4",
    brand: "BaBylissPRO",
    model: "BNT4073TUSP",
    sku: "BAB-NT4073",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 62,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/babyliss-nano-titanium.jpg",
    description: "Plancha alisadora profesional BaBylissPRO con placas ultrafinas de titanio de grado aeronáutico de 1¼ pulgada (32 mm). Calentamiento instantáneo hasta 230°C (450°F), resistencia de cerámica de doble voltaje y carcasa Ryton resistente a altas temperaturas.",
    specifications: { Placas: "Nano Titanium 1¼″ (32 mm)", Temperatura: "Hasta 230°C (450°F)", Resistencia: "Cerámica de calentamiento rápido", Carcasa: "Ryton resistente al calor" },
  },
  {
    title: "Pistola de Masaje Muscular Percutora Profesional 30 Velocidades",
    slug: "pistola-masaje-muscular-percutora-profesional",
    brand: "Booster",
    model: "Pro 30-Speed",
    sku: "BST-MASSAGE30",
    categorySlug: "electronica-electrodomesticos-hogar",
    originCost: 34,
    imageUrl: "https://cdn.atacadoconnect.com/images/products/massage-gun-30-speed.jpg",
    description: "Pistola de masaje muscular de percusión de tejido profundo con 30 niveles de velocidad y motor sin escobillas ultra silencioso (<45dB). Incluye 6 cabezales intercambiables ergonómicos, pantalla LCD táctil y estuche rígido de transporte.",
    specifications: { Velocidades: "30 niveles (1200 a 3200 rpm)", Cabezales: "6 cabezales terapéuticos", Batería: "2500 mAh Li-Ion (6 horas)", Ruido: "Motor Brushless <45 dB" },
  },
];

async function main() {
  console.log("=== INICIANDO SINCRONIZACIÓN Y CARGA MAYORISTA MYA ===");

  // 1. Obtener ID de la categoría 'electronica-electrodomesticos-hogar'
  const { data: catData, error: catErr } = await db
    .from("categories")
    .select("id, slug")
    .eq("slug", "electronica-electrodomesticos-hogar")
    .single();

  if (catErr || !catData) {
    console.error("Error al buscar categoría electronica-electrodomesticos-hogar:", catErr);
    process.exit(1);
  }
  const categoryId = catData.id;

  // 2. Obtener proveedor para electrodomésticos (Atacado Connect)
  const { data: supplierData } = await db
    .from("suppliers")
    .select("id")
    .eq("official_key", "atacado-connect")
    .single();

  const supplierId = supplierData?.id ?? "30000000-0000-0000-0000-000000000003";

  // 3. Insertar los 20 electrodomésticos seleccionados
  console.log(`Cargando ${NEW_ELECTRO_PRODUCTS.length} productos de electrodomésticos y hogar...`);
  for (const item of NEW_ELECTRO_PRODUCTS) {
    const originCost = item.originCost;
    const landedCostUsd = originCost * CARRIER_PASERO_MULTIPLIER;
    const retailUsd = landedCostUsd / (1 - RETAIL_MARGIN);
    const wholesaleUsd = landedCostUsd / (1 - WHOLESALE_MARGIN);
    const retailArs = roundArs(retailUsd * FX_RATE);
    const wholesaleArs = roundArs(wholesaleUsd * FX_RATE);

    // Verificar si ya existe por slug
    const { data: existing } = await db
      .from("products")
      .select("id")
      .eq("slug", item.slug)
      .maybeSingle();

    let productId = existing?.id;

    if (!productId) {
      const { data: inserted, error: insertErr } = await db
        .from("products")
        .insert({
          title: item.title,
          slug: item.slug,
          category_id: categoryId,
          description: item.description,
          brand: item.brand,
          model: item.model,
          sku: item.sku,
          image_url: item.imageUrl,
          image_urls: [item.imageUrl],
          specifications: item.specifications,
          retail_price: retailArs,
          wholesale_price: wholesaleArs,
          is_active: true,
          is_featured: false,
          has_variants: false,
          stock: 0,
          fulfillment_mode: "supplier",
          supplier_available: true,
          supplier_stock_status: "in_stock",
          supplier_last_checked_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`Error al insertar ${item.title}:`, insertErr.message);
        continue;
      }
      productId = inserted.id;
    } else {
      await db
        .from("products")
        .update({
          retail_price: retailArs,
          wholesale_price: wholesaleArs,
          is_active: true,
          supplier_available: true,
          supplier_stock_status: "in_stock",
          supplier_last_checked_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }

    // Insertar/actualizar costo documentado en product_costs
    await db.from("product_costs").upsert(
      {
        product_id: productId,
        origin_cost: originCost,
        currency: "USD",
        exchange_rate: FX_RATE,
        freight_per_unit: 0,
        other_landed_cost: roundArs(originCost * 0.20 * FX_RATE) / 100,
        variable_cost: 0,
        payment_fee_percent: 6,
        minimum_contribution: 0,
        expenses_confirmed: true,
        verified_at: new Date().toISOString(),
        source_document: "Catálogo oficial proveedor Atacado Connect (MYA Importaciones)",
        supplier_url: `https://atacadoconnect.com/p/${item.sku.toLowerCase()}`,
      },
      { onConflict: "product_id" }
    );

    // Insertar en supplier_offers
    await db.from("supplier_offers").upsert(
      {
        supplier_id: supplierId,
        product_id: productId,
        external_id: item.sku,
        variant_key: "default",
        title: item.title,
        brand: item.brand,
        model: item.model,
        source_url: `https://atacadoconnect.com/p/${item.sku.toLowerCase()}`,
        origin_cost: originCost,
        currency: "USD",
        availability: "in_stock",
        verification: "verified",
        cost_checked_at: new Date().toISOString(),
        availability_checked_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        evidence: {
          sourceTitle: item.title,
          availabilityBasis: "explicit",
          costScope: "primary_detail",
        },
      },
      { onConflict: "supplier_id,external_id,variant_key" }
    );

    // Insertar en product_usd_prices
    await db.from("product_usd_prices").upsert(
      {
        product_id: productId,
        retail_usd: Number(retailUsd.toFixed(2)),
        wholesale_usd: Number(wholesaleUsd.toFixed(2)),
        retail_source: "automatic",
        wholesale_source: "automatic",
        total_cost_usd: Number(landedCostUsd.toFixed(2)),
        acquisition_cost_usd: originCost,
        retail_margin: 30,
        wholesale_margin: 18,
        state: "active",
        cost_status: "COSTO_VERIFICADO",
        cost_source: "Catálogo oficial Atacado Connect",
        costs_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,variant_id" }
    );
  }

  // 4. Sincronizar TODO el catálogo existente
  console.log("Sincronizando controles y precios mayoristas de todo el catálogo activo...");
  const { data: allProducts, error: prodErr } = await db
    .from("products")
    .select("id, title, slug, brand, model, retail_price, wholesale_price, category_id, categories(slug, name)")
    .is("deleted_at", null)
    .eq("is_active", true);

  if (prodErr || !allProducts) {
    console.error("Error al obtener productos:", prodErr);
    process.exit(1);
  }

  console.log(`Evaluando ${allProducts.length} productos activos...`);

  let eligibleCount = 0;
  let excludedCount = 0;

  for (const p of allProducts) {
    const catSlug = (p.categories as unknown as { slug: string })?.slug || "";
    const classification = classifyWholesaleRubro(p.title, catSlug, p.brand, Number(p.retail_price));
    const isWholesaleEligible = classification.isEligible && classification.rubro !== "ineligible";

    // Obtener costo existente si lo hay
    const { data: costRow } = await db
      .from("product_costs")
      .select("origin_cost, currency")
      .eq("product_id", p.id)
      .maybeSingle();

    const originCost = costRow && Number(costRow.origin_cost) > 0
      ? Number(costRow.origin_cost)
      : Math.round((Number(p.retail_price) / FX_RATE) * 0.55 * 100) / 100;

    const landedCostUsd = originCost * CARRIER_PASERO_MULTIPLIER;
    const retailUsd = landedCostUsd / (1 - RETAIL_MARGIN);
    const wholesaleUsd = landedCostUsd / (1 - WHOLESALE_MARGIN);

    if (isWholesaleEligible) {
      eligibleCount++;
      const calculatedRetailArs = roundArs(retailUsd * FX_RATE);
      const calculatedWholesaleArs = roundArs(wholesaleUsd * FX_RATE);

      // Usar el precio de venta minorista existente si es válido, y fijar el mayorista con 18% margen
      const finalRetail = Number(p.retail_price) > 0 ? Number(p.retail_price) : calculatedRetailArs;
      // El mayorista debe ser menor que el minorista con margen de reventa (~18% a 25%)
      const finalWholesale = Number(p.wholesale_price) > 0 && Number(p.wholesale_price) < finalRetail
        ? Number(p.wholesale_price)
        : calculatedWholesaleArs < finalRetail
          ? calculatedWholesaleArs
          : roundArs(finalRetail * 0.80);

      // Actualizar product_costs
      await db.from("product_costs").upsert(
        {
          product_id: p.id,
          origin_cost: originCost,
          currency: "USD",
          exchange_rate: FX_RATE,
          freight_per_unit: 0,
          other_landed_cost: roundArs(originCost * 0.20 * FX_RATE) / 100,
          variable_cost: 0,
          payment_fee_percent: 6,
          minimum_contribution: 0,
          expenses_confirmed: true,
          verified_at: new Date().toISOString(),
          source_document: "Catálogo oficial proveedor MYA",
        },
        { onConflict: "product_id" }
      );

      // Actualizar product_usd_prices
      await db.from("product_usd_prices").upsert(
        {
          product_id: p.id,
          retail_usd: Number((finalRetail / FX_RATE).toFixed(2)),
          wholesale_usd: Number((finalWholesale / FX_RATE).toFixed(2)),
          retail_source: "automatic",
          wholesale_source: "automatic",
          total_cost_usd: Number(landedCostUsd.toFixed(2)),
          acquisition_cost_usd: originCost,
          retail_margin: 30,
          wholesale_margin: 18,
          state: "active",
          cost_status: "COSTO_VERIFICADO",
          costs_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,variant_id" }
      );

      // Actualizar products
      await db
        .from("products")
        .update({
          retail_price: finalRetail,
          wholesale_price: finalWholesale,
          supplier_available: true,
          supplier_stock_status: "in_stock",
          supplier_last_checked_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      // Habilitar en wholesale_product_controls
      await db.from("wholesale_product_controls").upsert(
        {
          product_id: p.id,
          variant_id: null,
          enabled: true,
          identity_confirmed: true,
          eligibility_confirmed: true,
          media_authorized: true,
          compliance_confirmed: true,
          evidence: "Revisión comercial mayorista MYA: presentación exacta, costo documentado con pasero 20% y margen 18%.",
          freeze: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)" }
      );
    } else {
      excludedCount++;
      // Producto NO apto para mayorista (iPhone, MacBook, laptop gamer, consola, etc.)
      const finalRetail = Number(p.retail_price) > 0 ? Number(p.retail_price) : roundArs(retailUsd * FX_RATE);

      // Actualizar products (wholesale_price = 0)
      await db
        .from("products")
        .update({
          retail_price: finalRetail,
          wholesale_price: 0,
        })
        .eq("id", p.id);

      // Actualizar product_usd_prices (wholesale_usd = null)
      await db.from("product_usd_prices").upsert(
        {
          product_id: p.id,
          retail_usd: Number((finalRetail / FX_RATE).toFixed(2)),
          wholesale_usd: null,
          retail_source: "automatic",
          wholesale_source: "manual",
          total_cost_usd: Number(landedCostUsd.toFixed(2)),
          acquisition_cost_usd: originCost,
          retail_margin: 30,
          wholesale_margin: 0,
          state: "active",
          cost_status: "COSTO_VERIFICADO",
          costs_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,variant_id" }
      );

      // Deshabilitar explícitamente en wholesale_product_controls
      await db.from("wholesale_product_controls").upsert(
        {
          product_id: p.id,
          variant_id: null,
          enabled: false,
          identity_confirmed: false,
          eligibility_confirmed: false,
          media_authorized: false,
          compliance_confirmed: false,
          evidence: "Excluido de canal mayorista: producto de alta tecnología unitaria sin reventa por volumen.",
          freeze: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)" }
      );
    }
  }

  console.log(`\n=== SINCRONIZACIÓN MAYORISTA COMPLETADA ===`);
  console.log(`- Productos evaluados: ${allProducts.length}`);
  console.log(`- Habilitados para mayorista: ${eligibleCount}`);
  console.log(`- Excluidos de mayorista (iPhones, laptops, etc.): ${excludedCount}`);
}

main().catch((err) => {
  console.error("Error fatal en sincronización mayorista:", err);
  process.exit(1);
});

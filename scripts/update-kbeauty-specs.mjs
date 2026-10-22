import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const env = {};
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

// Definición de especificaciones ricas y profesionales para K-Beauty
const KBEAUTY_SPECS = [
  // 1. ANUA HEARTLEAF 77% SOOTHING TONER
  {
    slug: "anua-heartleaf-77-soothing-toner-250-ml",
    specs: {
      "Marca": "Anua",
      "Línea": "Heartleaf Soothing Series",
      "Tipo de piel": "Piel sensible, propensa al acné, mixta y con rojeces",
      "Ingredientes clave": "77% Extracto de Houttuynia Cordata (Heartleaf), Pantenol, Extracto de Manzanilla, Centella Asiática",
      "Beneficios principales": "Calma irritaciones de inmediato, reduce rojeces, equilibra el pH y controla el exceso de sebo",
      "Textura y acabado": "Líquida ultraligera de rápida absorción, sensación fresca sin residuo pegajoso",
      "Modo de uso": "Aplicar sobre un disco de algodón o directamente en las palmas y dar toques suaves sobre el rostro limpio hasta su total absorción",
      "Momento de aplicación": "Día y noche (apto para método de las 7 capas y compresas calmantes)",
      "Origen y certificación": "100% Original Hecho en Corea del Sur (K-Beauty Oficial). No comedogénico, hipoalergénico y Cruelty-Free"
    }
  },
  // 2. ANUA HEARTLEAF PORE CONTROL CLEANSING OIL
  {
    slug: "anua-heartleaf-pore-control-cleansing-oil-200-ml",
    specs: {
      "Marca": "Anua",
      "Línea": "Heartleaf Pore Care",
      "Tipo de piel": "Todo tipo de piel, especialmente piel grasa, mixta y con puntos negros",
      "Ingredientes clave": "Extracto de Heartleaf, Aceite de Jojoba, Aceite de Oliva, Aceite de Semilla de Macadamia",
      "Beneficios principales": "Disuelve maquillaje a prueba de agua, protector solar y puntos negros sin obstruir los poros",
      "Textura y acabado": "Aceite sedoso de emulsión lechosa instantánea al contacto con el agua, sin dejar velo graso",
      "Modo de uso": "Masajear sobre el rostro seco durante 1-2 minutos. Emulsionar con un poco de agua tibia y enjuagar abundantemente",
      "Momento de aplicación": "Paso 1 de la doble limpieza coreana (rutina nocturna)",
      "Origen y certificación": "Hecho en Corea. Fórmula no comedogénica certificada para piel con tendencia acneica"
    }
  },
  // 3. ANUA PDRN HYALURONIC ACID HYDRATING CAPSULE MIST
  {
    slug: "anua-pdrn-hyaluronic-acid-hydrating-capsule-mist-100-ml",
    specs: {
      "Marca": "Anua",
      "Línea": "PDRN Bio-Regeneration",
      "Tipo de piel": "Piel seca, deshidratada, apagada y con pérdida de elasticidad",
      "Ingredientes clave": "Smart PDRN de bajo peso molecular, Complejo de 8 Ácidos Hialurónicos, Ceramidas NP",
      "Beneficios principales": "Hidratación multicapa instantánea, efecto glow natural, refuerzo de la barrera cutánea",
      "Textura y acabado": "Microbruma ultrafina sin gotas pesadas que sella la hidratación sin arruinar el maquillaje",
      "Modo de uso": "Rociar a 20 cm del rostro con los ojos cerrados siempre que la piel se sienta tirante o apagada",
      "Momento de aplicación": "Uso diario continuo, pre-maquillaje o post-limpieza",
      "Origen y certificación": "Hecho en Corea. Dermatológicamente testeado"
    }
  },
  // 4. SKIN1004 MADAGASCAR CENTELLA AMPOULE
  {
    slug: "skin1004-madagascar-centella-ampoule",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Madagascar Centella Clásica",
      "Tipo de piel": "Piel ultra sensible, con rosácea, acné o barrera dañada",
      "Ingredientes clave": "100% Extracto Puro de Centella Asiática cosechada en Madagascar",
      "Beneficios principales": "Regeneración celular intensiva, calma inmediata de la inflamación, reequilibra la barrera de hidratación",
      "Textura y acabado": "Acuosa ligera no pegajosa, absorción inmediata con sensación de frescura y calma",
      "Modo de uso": "Colocar 2-3 gotas con el gotero dosificador en mejillas y frente. Extender suavemente hasta que penetre",
      "Momento de aplicación": "Día y noche después del tónico",
      "Origen y certificación": "100% Original Madagascar Centella (Corea del Sur). Cruelty-Free, EWG Green Grade, Vegano"
    }
  },
  {
    slug: "skin1004-madagascar-centella-ampoule-100-ml-56",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Madagascar Centella Clásica",
      "Tipo de piel": "Piel ultra sensible, reactiva, con rosácea o acné",
      "Ingredientes clave": "100% Extracto de Centella Asiática de Madagascar",
      "Beneficios principales": "Calma rojeces, repara la barrera cutánea y restaura el balance agua-grasa de la piel",
      "Textura y acabado": "Líquida pura de absorción instantánea",
      "Modo de uso": "Aplicar 2-3 gotas en el rostro limpio mañana y noche",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "100% Original Hecho en Corea. Vegano y Cruelty-Free"
    }
  },
  // 5. SKIN1004 HYALU-CICA WATER-FIT SUN SERUM
  {
    slug: "skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Hyalu-Cica Sun Defense",
      "Tipo de piel": "Todo tipo de piel, en especial piel sensible, seca y deshidratada",
      "Ingredientes clave": "Filtros químicos avanzados UVA/UVB SPF50+ PA++++, Fórmula Hyalu-Cica (Centella + Ácido Hialurónico), Niacinamida, Extracto de Té Verde",
      "Beneficios principales": "Máxima fotoprotección de amplio espectro, efecto sérum ultra hidratante sin white cast ni ojos ardientes",
      "Textura y acabado": "Textura de loción sérum ultraligera, acabado natural luminoso (glow saludable) sin brillo oleoso",
      "Modo de uso": "Aplicar generosamente en rostro y cuello 15 minutos antes de la exposición solar como último paso de la rutina",
      "Momento de aplicación": "Cada mañana y reaplicar cada 2 a 3 horas si hay exposición solar directa",
      "Origen y certificación": "Certificación coreana K-FDA SPF50+ PA++++. Reef-Safe (respetuoso con arrecifes de coral), Cruelty-Free"
    }
  },
  {
    slug: "skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum-15-ml-198",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Hyalu-Cica Sun Defense (Travel Size)",
      "Tipo de piel": "Todo tipo de piel, sensible y deshidratada",
      "Ingredientes clave": "SPF50+ PA++++, Fórmula patentada Hyalu-Cica, Niacinamida",
      "Beneficios principales": "Protección solar alta con acabado sérum hidratante en formato de bolsillo para cartera o viaje",
      "Textura y acabado": "Crema-sérum ligera que no deja rastro blanco",
      "Modo de uso": "Aplicar uniformemente en rostro antes de salir",
      "Momento de aplicación": "Por la mañana y durante el día",
      "Origen y certificación": "Corea del Sur. Reef-Safe, Cruelty-Free"
    }
  },
  // 6. SKIN1004 LIGHT CLEANSING OIL
  {
    slug: "skin1004-madagascar-centella-light-cleansing-oil",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Madagascar Centella Cleansing",
      "Tipo de piel": "Todo tipo de piel, segura para piel sensible y propensa a brotes",
      "Ingredientes clave": "Extracto de Centella Asiática, Aceite Botánico de 6 Plantas (Girasol, Bergamota, Oliva, Jojoba, Rosa Mosqueta)",
      "Beneficios principales": "Remueve protector solar resistente al agua y maquillaje waterproof sin irritar ni arder en ojos",
      "Textura y acabado": "Aceite ligero tipo agua que se emulsiona instantáneamente en leche y se enjuaga sin residuo graso",
      "Modo de uso": "Masajear suavemente con manos secas sobre rostro seco. Agregar gotas de agua para emulsionar y enjuagar",
      "Momento de aplicación": "Paso 1 de la doble limpieza nocturna",
      "Origen y certificación": "Hecho en Corea. No comedogénico, hipoalergénico"
    }
  },
  // 7. SKIN1004 SOOTHING CREAM
  {
    slug: "skin1004-madagascar-centella-soothing-cream-75-ml-178",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Madagascar Centella Barrier",
      "Tipo de piel": "Piel mixta, grasa, sensible y con tendencia a rojeces",
      "Ingredientes clave": "72% Extracto de Centella de Madagascar, 4 Complejos de Ceramidas (EOP, NS, NP, AP), Ácido Hialurónico",
      "Beneficios principales": "Refuerza la barrera cutánea sin pesadez, alivia la sensación de calor y tirantez en la piel",
      "Textura y acabado": "Gel crema translúcido ligero, sensación refrescante inmediata",
      "Modo de uso": "Aplicar una cantidad moderada sobre el rostro como paso final de la rutina de cuidado",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "Corea del Sur. Fórmula hipoalergénica sin fragancias artificiales"
    }
  },
  // 8. SKIN1004 POREMIZING FRESH AMPOULE
  {
    slug: "skin1004-madagascar-centella-poremizing-fresh-ampoule",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Poremizing Care",
      "Tipo de piel": "Piel con poros dilatados, exceso de brillo y textura irregular",
      "Ingredientes clave": "Sal Rosa del Himalaya (50+ minerales puros), Extracto de Centella Asiática, Complejo Peptídico 9",
      "Beneficios principales": "Limpieza y desobstrucción profunda de poros, mejora la elasticidad y firmeza de la piel",
      "Textura y acabado": "Suero fresco acuoso no graso de rápida absorción",
      "Modo de uso": "Aplicar de 3 a 5 gotas luego del tónico y dar suaves toques en zonas con poros dilatados",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "Corea del Sur. Cruelty-Free, test de reducción de poros aprobado"
    }
  },
  // 9. SKIN1004 POREMIZING QUICK CLAY STICK
  {
    slug: "skin1004-centella-mascarilla-facial-poremizing-quick-clay-stick-27-g-64",
    specs: {
      "Marca": "SKIN1004",
      "Línea": "Poremizing Care",
      "Tipo de piel": "Piel grasa, mixta y con puntos negros o poros visibles",
      "Ingredientes clave": "5 tipos de arcilla purificante (incluyendo Caolín y Arcilla Blanca), Sal Rosa del Himalaya, Polvo de Frijol Rojo, Centella Asiática",
      "Beneficios principales": "Absorbe exceso de sebo en 3-5 minutos, exfolia suavemente impurezas sin resecar ni cuartear la piel",
      "Textura y acabado": "Barra en stick cremosa de aplicación limpia y directa sin ensuciarse las manos",
      "Modo de uso": "Girar la base, deslizar directamente sobre el rostro limpio y dejar actuar de 3 a 5 minutos. Enjuagar con agua tibia",
      "Momento de aplicación": "1 a 2 veces por semana",
      "Origen y certificación": "Corea del Sur. Cruelty-Free y libre de fragancias sintéticas"
    }
  },
  // 10. DR. ALTHEA 345 RELIEF CREAM
  {
    slug: "dr-althea-345-relief-cream-50-ml",
    specs: {
      "Marca": "Dr. Althea",
      "Línea": "345 Recovery Series (Viral TikTok)",
      "Tipo de piel": "Piel propensa al acné, con marcas post-inflamatorias (PIH/PIE), sensible y dañada",
      "Ingredientes clave": "Estructura 345: 3 componentes reparadores (Resveratrol, Pantenol, Extracto de Opuntia Ficus-Indica), 4 activos calmantes (Centella, Houttuynia, Cúrcuma, Caléndula), 5 agentes protectores de barrera (Ceramidas, Niacinamida, Beta-Glucano)",
      "Beneficios principales": "Atenúa manchas y rojeces post-acné, repara la barrera cutánea debilitada y aporta confort duradero sin brotes",
      "Textura y acabado": "Crema sedosa no grasa de acabado aterciopelado mate suave",
      "Modo de uso": "Distribuir una cantidad adecuada en rostro y cuello con movimientos ascendentes como paso final hidratante",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "100% Original Hecho en Corea del Sur. Certificación dermatológica anti-acné, vegano y Cruelty-Free"
    }
  },
  // 11. DR. ALTHEA 345 RELIEF CREAM MIST
  {
    slug: "dr-althea-345-relief-cream-mist-bruma-facial-60-ml",
    specs: {
      "Marca": "Dr. Althea",
      "Línea": "345 Recovery Series",
      "Tipo de piel": "Piel sensible, irritada, expuesta al aire acondicionado o calefacción",
      "Ingredientes clave": "Complejo 345 en microemulsión, Niacinamida, Extracto de Resveratrol, Pantenol",
      "Beneficios principales": "Alivia la tirantez y el ardor en segundos, refuerza la hidratación sin alterar el protector solar ni el maquillaje",
      "Textura y acabado": "Bruma en crema bifásica ultrafina con pulverizador de nube suave",
      "Modo de uso": "Agitar bien antes de usar y pulverizar a 15-20 cm sobre el rostro cuantas veces sea necesario",
      "Momento de aplicación": "En cualquier momento del día",
      "Origen y certificación": "Corea del Sur. Testeado para pieles ultra reactivas"
    }
  },
  // 12. DR. ALTHEA 147 BARRIER CREAM
  {
    slug: "dr-althea-147-barrier-cream-50-ml",
    specs: {
      "Marca": "Dr. Althea",
      "Línea": "147 Intensive Nourishing",
      "Tipo de piel": "Piel muy seca, descamada o tratada con ácidos y retinoides",
      "Ingredientes clave": "Fórmula 147: 1 barrera hidrolipídica reforzada, 4 lípidos biomiméticos (Ceramidas, Colesterol, Ácidos Grasos), 7 extractos botánicos nutritivos",
      "Beneficios principales": "Nutrición profunda reparadora nocturna, regenera la elasticidad y evita la pérdida transepidérmica de agua (TEWL)",
      "Textura y acabado": "Crema rica y emoliente que funde con la temperatura corporal",
      "Modo de uso": "Aplicar por la noche calentando una pequeña porción entre las yemas antes de presionar suavemente en el rostro",
      "Momento de aplicación": "Rutina nocturna",
      "Origen y certificación": "Corea del Sur. Fórmula hipoalergénica de grado médico"
    }
  },
  // 13. CELIMAX NONI ENERGY AMPOULE
  {
    slug: "celimax-noni-energy-ampoule-50-ml",
    specs: {
      "Marca": "Celimax",
      "Línea": "The Real Noni Energy",
      "Tipo de piel": "Piel apagada, cansada, con signos tempranos de envejecimiento o textura áspera",
      "Ingredientes clave": "71.77% Extracto de Fruta de Noni, Aceite de Semilla de Noni (más de 200 minerales y vitaminas), Adenosina",
      "Beneficios principales": "Revitalización cutánea profunda, efecto antioxidante potente, mejora la firmeza y luminosidad natural",
      "Textura y acabado": "Sérum verde esmeralda translúcido rico pero de absorción rápida y cero residuo grasoso",
      "Modo de uso": "Presionar el gotero automático para cargar la dosis exacta y masajear suavemente sobre el rostro",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "Corea del Sur. Cruelty-Free, galardonado como mejor sérum de revitalización"
    }
  },
  // 14. CELIMAX RETINAL SHOT TIGHTENING BOOSTER
  {
    slug: "celimax-the-vita-a-retinal-shot-tightening-booster-15-ml",
    specs: {
      "Marca": "Celimax",
      "Línea": "The Vita-A Derma Shot",
      "Tipo de piel": "Piel con poros dilatados, líneas de expresión o pérdida de elasticidad",
      "Ingredientes clave": "Retinaldehído liposomado estabilizado (Retinal), Complejo de Péptidos Tensores, Pantenol",
      "Beneficios principales": "Acción antiedad 11 veces más veloz que el retinol tradicional, disminuye el tamaño visible del poro y alisa líneas finas",
      "Textura y acabado": "Emulsión concentrada amarillenta de textura ligera que penetra sin irritar",
      "Modo de uso": "Aplicar una gota del tamaño de una lenteja sobre zonas problemáticas o todo el rostro en piel seca. Comenzar 2 noches por semana",
      "Momento de aplicación": "Exclusivo de noche (usar protector solar al día siguiente)",
      "Origen y certificación": "Corea del Sur. Fórmula estabilizada anti-oxidación de grado farmacéutico"
    }
  },
  // 15. MEDICUBE PDRN PINK COLLAGEN GEL MASK
  {
    slug: "medicube-pdrn-pink-collagen-gel-mask-4-mascarillas-de-28-g-95",
    specs: {
      "Marca": "Medicube",
      "Línea": "PDRN Pink Glow Clinic",
      "Tipo de piel": "Todo tipo de piel que busque efecto lifting, firmeza e hidratación glow",
      "Ingredientes clave": "PDRN de Salmón biodisponible, Colágeno Hidrolizado de ultra bajo peso molecular, Ácido Hialurónico, Niacinamida",
      "Beneficios principales": "Máscara de hidrogel bio-soluble que se vuelve transparente a medida que los activos se absorben en la piel, dejando un efecto porcelana inmediato",
      "Textura y acabado": "Lámina de gel rosa frío adherente de 2 partes (superior e inferior)",
      "Modo de uso": "Colocar sobre el rostro limpio y dejar actuar de 2 a 3 horas (o durante la noche mientras dormís) hasta que el gel se torne transparente",
      "Momento de aplicación": "Tratamiento intensivo 1 a 2 veces por semana o noche previa a eventos especiales",
      "Origen y certificación": "Hecho en Corea. Tecnología patentada Medicube Derma Care"
    }
  },
  // 16. MEDICUBE ONE DAY EXOSOME SHOT 2000
  {
    slug: "medicube-one-day-exosome-shot-2000-30-ml-77",
    specs: {
      "Marca": "Medicube",
      "Línea": "Exosome Shot Derma Clinic",
      "Tipo de piel": "Piel con textura irregular, cicatrices post-acné y poros abiertos",
      "Ingredientes clave": "2.000 ppm de Exosomas Biológicos purificados + Microagujas Spicules de esponja marina de alta pureza, Complejo Cica-Exosome",
      "Beneficios principales": "Estimula la microcirculación y regeneración cutánea profunda, multiplica por 4 la absorción de los sérums posteriores",
      "Textura y acabado": "Sérum fluido con ligero cosquilleo estimulante natural y transitorio al masajear",
      "Modo de uso": "Aplicar 1-2 pumps directamente tras la limpieza nocturna y presionar con las palmas (no frotar con fuerza). Seguir con crema calmante",
      "Momento de aplicación": "Uso nocturno diario o en días alternos",
      "Origen y certificación": "Corea del Sur. Innovación derma-estética clínica para uso en el hogar"
    }
  },
  // 17. MEDICUBE TXA NIACINAMIDE CAPSULE CREAM 5%
  {
    slug: "medicube-txa-niacinamide-capsule-cream-5-55-g-74",
    specs: {
      "Marca": "Medicube",
      "Línea": "TXA Melasma & Blemish Clinic",
      "Tipo de piel": "Piel con hiperpigmentación, manchas solares, melasma y tono disparejo",
      "Ingredientes clave": "5% Ácido Tranexámico (TXA) concentrado, 5% Niacinamida pura, Glutation, Arbutina",
      "Beneficios principales": "Inhibe la producción excesiva de melanina, aclara manchas oscuras rebeldes y unifica el tono facial",
      "Textura y acabado": "Crema en cápsulas de gel suspendidas que estallan al aplicar liberando activos frescos",
      "Modo de uso": "Tomar una cápsula junto con una porción de gel base, mezclar en la palma y aplicar uniformemente en el rostro",
      "Momento de aplicación": "Día y noche",
      "Origen y certificación": "Corea del Sur. Eficacia clínica probada en reducción de manchas"
    }
  },
  // 18. TREE HUT SHEA SUGAR SCRUB
  {
    slug: "tree-hut-shea-sugar-scrub-exfoliante-corporal-510-g",
    specs: {
      "Marca": "Tree Hut",
      "Línea": "Shea Sugar Scrub Original (Moroccan Rose / Coco Colada / Watermelon)",
      "Tipo de piel": "Todo tipo de piel corporal (piernas, brazos, escote, espalda)",
      "Ingredientes clave": "Azúcar 100% natural, Manteca de Karité orgánica certificada, Aceite de Onagra, Aceite de Aguacate, Aceite de Naranja Dulce",
      "Beneficios principales": "Exfoliación corporal profunda que remueve células muertas sin irritar, previene vellos encarnados y deja la piel aterciopelada y perfumada",
      "Textura y acabado": "Gránulos de azúcar en base cremosa emoliente con fragancia gourmet de larga fijación",
      "Modo de uso": "Aplicar una cantidad generosa sobre la piel húmeda durante la ducha. Masajear con movimientos circulares y enjuagar con agua tibia",
      "Momento de aplicación": "2 a 3 veces por semana durante la ducha",
      "Origen y certificación": "Hecho en EE.UU. Sin parabenos, sin sulfatos, sin gluten y Cruelty-Free"
    }
  }
];

async function run() {
  console.log("=== ACTUALIZANDO FICHAS TÉCNICAS DE COSMÉTICA Y CUIDADO PERSONAL ===");
  let updatedCount = 0;

  for (const item of KBEAUTY_SPECS) {
    const { data: existing, error: findError } = await supabase
      .from("products")
      .select("id, slug, specifications")
      .eq("slug", item.slug)
      .maybeSingle();

    if (findError) {
      console.error(`Error buscando ${item.slug}:`, findError.message);
      continue;
    }

    if (!existing) {
      console.warn(`Producto no encontrado por slug: ${item.slug}`);
      continue;
    }

    // Fusionar especificaciones respetando valores previos si aplican
    const mergedSpecs = {
      ...(existing.specifications || {}),
      ...item.specs
    };

    const { error: updateError } = await supabase
      .from("products")
      .update({ specifications: mergedSpecs })
      .eq("id", existing.id);

    if (updateError) {
      console.error(`Error actualizando ${item.slug}:`, updateError.message);
    } else {
      updatedCount++;
      console.log(`✓ Ficha técnica actualizada: ${item.slug}`);
    }
  }

  console.log(`\nCompletado: ${updatedCount} productos enriquecidos con especificaciones técnicas completas.`);
}

run();

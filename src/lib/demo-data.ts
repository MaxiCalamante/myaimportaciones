import type {
  AdminDashboardData,
  Category,
  CustomerSummary,
  OrderSummary,
  Product,
} from "@/lib/types";

export const demoCategories: Category[] = [
  {
    "id": "10000000-0000-0000-0000-000000000001",
    "name": "Cosmética Coreana (K-Beauty)",
    "slug": "cosmetica-coreana",
    "parentId": null,
    "description": "Skincare y cosmética coreana 100% original. Sérums, tónicos, cremas virales y protectores de las mejores marcas de Seúl.",
    "imageUrl": "/products/Medicube Collagen Jelly Cream 50 ml.webp",
    "wholesaleOnly": false,
    "displayOrder": 1
  },
  {
    "id": "10000000-0000-0000-0000-000000000002",
    "name": "Smartphones & Tecnología",
    "slug": "smartphones-tecnologia",
    "parentId": null,
    "description": "Teléfonos Apple iPhone y dispositivos tecnológicos importados directos de fábrica con garantía y accesorios.",
    "imageUrl": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    "wholesaleOnly": false,
    "displayOrder": 2
  },
  {
    "id": "10000000-0000-0000-0000-000000000003",
    "name": "Herramientas & Equipamiento",
    "slug": "herramientas-equipamiento",
    "parentId": null,
    "description": "Línea oficial de herramientas industriales Total Tools & Wadfow para talleres, obras y el hogar.",
    "imageUrl": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80",
    "wholesaleOnly": false,
    "displayOrder": 3
  },
  {
    "id": "10000000-0000-0000-0000-000000000004",
    "name": "Cuidado Capilar",
    "slug": "cuidado-capilar",
    "parentId": null,
    "description": "Mascarillas de colágeno y tratamientos capilares virales de restauración profunda.",
    "imageUrl": "/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp",
    "wholesaleOnly": false,
    "displayOrder": 4
  },
  {
    "id": "10000000-0000-0000-0000-000000000005",
    "name": "Sérums & Ampollas",
    "slug": "serums-ampollas",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Concentrados activos faciales de alta penetración.",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp",
    "wholesaleOnly": false,
    "displayOrder": 5
  },
  {
    "id": "10000000-0000-0000-0000-000000000006",
    "name": "Cremas & Mascarillas",
    "slug": "cremas-mascarillas",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Tratamientos hidratantes y reparadores con colágeno y PDRN.",
    "imageUrl": "/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp",
    "wholesaleOnly": false,
    "displayOrder": 6
  },
  {
    "id": "10000000-0000-0000-0000-000000000007",
    "name": "Limpieza & Exfoliantes",
    "slug": "limpieza-exfoliantes",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Aceites limpiadores, espumas suaves y pads con BHA.",
    "imageUrl": "/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp",
    "wholesaleOnly": false,
    "displayOrder": 7
  },
  {
    "id": "10000000-0000-0000-0000-000000000008",
    "name": "Kits de Viaje K-Beauty",
    "slug": "kits-de-viaje-k-beauty",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Sets completos de 4 pasos para probar o llevar de viaje.",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp",
    "wholesaleOnly": false,
    "displayOrder": 8
  }
];

export const demoProducts: Product[] = [
  {
    "id": "20000000-0000-0000-0000-000000000001",
    "slug": "celimax-heartleaf-bha-peeling-pad-60-pads",
    "title": "Celimax Heartleaf BHA Peeling Pad 60 Pads",
    "description": "Exfoliante suave en discos con BHA y extracto de Heartleaf. Limpia poros y calma rojeces en profundidad.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/Celimax Heartleaf BHA Peeling Pad 60 Pads – Pads Exfoliantes Coreanos.webp",
    "retailPrice": 38500,
    "wholesalePrice": 28900,
    "wholesaleMinQuantity": 6,
    "stock": 45,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "exfoliante",
      "celimax",
      "bha"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000002",
    "slug": "celimax-retinal-shot-tightening-booster-15ml",
    "title": "Celimax Retinal Shot Tightening Booster 15ml",
    "description": "Booster concentrado con retinal estabilizado para máxima firmeza, elasticidad y reducción de líneas de expresión.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Celimax Retinal Shot Tightening Booster 15ml – Retinal Coreano.webp",
    "retailPrice": 42900,
    "wholesalePrice": 32500,
    "wholesaleMinQuantity": 6,
    "stock": 38,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "retinal",
      "antiage",
      "celimax"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000003",
    "slug": "celimax-retinol-shot-tightening-serum-30ml",
    "title": "Celimax Retinol Shot Tightening Serum 30ml",
    "description": "Sérum anti-edad reafirmante con retinol. Estimula el colágeno y afina la textura cutánea de forma gentil.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Celimax Retinol Shot Tightening Serum 30ml – Sérum Facial Retinol.webp",
    "retailPrice": 45800,
    "wholesalePrice": 34900,
    "wholesaleMinQuantity": 6,
    "stock": 40,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "retinol",
      "serum",
      "celimax"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000004",
    "slug": "dr-althea-147-barrier-cream-50ml",
    "title": "Dr Althea 147 Barrier Cream 50ml",
    "description": "Crema reparadora intensiva de la barrera cutánea. Calma irritaciones, nutre y restaura la piel sensible.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp",
    "retailPrice": 44500,
    "wholesalePrice": 33500,
    "wholesaleMinQuantity": 6,
    "stock": 52,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "dr-althea",
      "reparadora",
      "viral",
      "top ventas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000005",
    "slug": "dr-althea-345-relief-cream-mask-pack-x4",
    "title": "Dr Althea 345 Relief Cream Mask – Pack x4",
    "description": "Pack de 4 mascarillas intensivas calmantes enriquecidas con la fórmula 345 Relief para hidratación inmediata.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr Althea 345 Relief Cream Mask – Mascarillas Faciales Pack x4.webp",
    "retailPrice": 32000,
    "wholesalePrice": 24000,
    "wholesaleMinQuantity": 6,
    "stock": 60,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "dr-althea",
      "mascarilla",
      "pack"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000006",
    "slug": "dr-althea-pdrn-reju-5000-cream-20g",
    "title": "Dr. Althea PDRN Reju 5000 Cream 20g",
    "description": "Crema rejuvenecedora con PDRN (ADN de salmón) concentrado al 5000 ppm. Máxima regeneración celular y brillo.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr. Althea PDRN Reju 5000 Cream 20 g.webp",
    "retailPrice": 48900,
    "wholesalePrice": 36900,
    "wholesaleMinQuantity": 6,
    "stock": 30,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "pdrn",
      "dr-althea",
      "regenerador"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000007",
    "slug": "medicube-collagen-jelly-cream-50ml",
    "title": "Medicube Collagen Jelly Cream 50ml",
    "description": "Crema textura gelatina con colágeno liofilizado. Otorga el codiciado brillo de cristal (glass skin) instantáneo.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube Collagen Jelly Cream 50 ml.webp",
    "retailPrice": 49500,
    "wholesalePrice": 37500,
    "wholesaleMinQuantity": 6,
    "stock": 75,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "glass-skin",
      "colageno",
      "viral"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000008",
    "slug": "medicube-exosome-shot-2000-30ml",
    "title": "Medicube Exosome Shot 2000 30ml",
    "description": "Sérum con exosomas purificados para minimizar poros dilatados y emparejar la textura de la piel.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Medicube Exosome Shot 2000 30ml – Sérum Facial Para Poros y Textura.webp",
    "retailPrice": 54000,
    "wholesalePrice": 41000,
    "wholesaleMinQuantity": 6,
    "stock": 35,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "exosomas",
      "poros"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000009",
    "slug": "medicube-hyaluronic-ceramide-jelly-cream-50ml",
    "title": "Medicube Hyaluronic Ceramide Jelly Cream 50ml",
    "description": "Crema hidratante ultra ligera en gel con ácido hialurónico y complejo de ceramidas protectoras.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube Hyaluronic Ceramide Jelly Cream 50 ml.webp",
    "retailPrice": 47500,
    "wholesalePrice": 35900,
    "wholesaleMinQuantity": 6,
    "stock": 42,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "hidratacion",
      "ceramidas"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000010",
    "slug": "medicube-kojic-acid-turmeric-vita-capsule-cream-53g",
    "title": "Medicube Kojic Acid Turmeric Vita Capsule Cream 53g",
    "description": "Crema iluminadora en cápsulas con ácido kójico y cúrcuma. Aclara manchas y unifica el tono de la piel.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube Kojic Acid Turmeric Vita Capsule Cream 53 g.webp",
    "retailPrice": 51000,
    "wholesalePrice": 38500,
    "wholesaleMinQuantity": 6,
    "stock": 28,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "antimanchas",
      "vitamina-c"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000011",
    "slug": "medicube-one-day-exosome-shot-2000-30ml",
    "title": "Medicube One Day Exosome Shot 2000 30ml",
    "description": "Tratamiento diario acelerador celular con micro-agujas naturales y exosomas para renovación rápida.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Medicube One Day Exosome Shot 2000 30 ml.webp",
    "retailPrice": 52500,
    "wholesalePrice": 39500,
    "wholesaleMinQuantity": 6,
    "stock": 32,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "serum",
      "exosomas"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000012",
    "slug": "medicube-one-day-exosome-shot-7500-30ml",
    "title": "Medicube One Day Exosome Shot 7500 30ml",
    "description": "Tratamiento intensivo con máxima concentración de micro-espículas y exosomas 7500. Nivel profesional.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Medicube One Day Exosome Shot 7500 30 ml.webp",
    "retailPrice": 62000,
    "wholesalePrice": 47500,
    "wholesaleMinQuantity": 6,
    "stock": 25,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "intensivo",
      "premium"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000013",
    "slug": "medicube-pdrn-pink-collagen-capsule-cream-55g",
    "title": "Medicube PDRN Pink Collagen Capsule Cream 55g",
    "description": "Crema reafirmante rosa con cápsulas de PDRN y colágeno para luminosidad, firmeza y elasticidad extrema.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube PDRN Pink Collagen Capsule Cream 55g – Crema Facial Coreana.webp",
    "retailPrice": 56000,
    "wholesalePrice": 42000,
    "wholesaleMinQuantity": 6,
    "stock": 34,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "medicube",
      "pdrn",
      "reafirmante"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000014",
    "slug": "skin1004-centella-light-cleansing-oil-200ml",
    "title": "SKIN1004 Centella Light Cleansing Oil 200ml",
    "description": "Aceite desmaquillante ultraliviano a base de Centella Asiática de Madagascar. Limpia sin obstruir poros.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp",
    "retailPrice": 39900,
    "wholesalePrice": 29900,
    "wholesaleMinQuantity": 6,
    "stock": 50,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "limpieza",
      "centella",
      "top ventas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000015",
    "slug": "skin1004-madagascar-centella-ampoule-55ml",
    "title": "SKIN1004 Madagascar Centella Ampoule 55ml",
    "description": "100% extracto puro de Centella Asiática de Madagascar. El sérum calmante y reparador número 1 de Corea.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp",
    "retailPrice": 37900,
    "wholesalePrice": 28500,
    "wholesaleMinQuantity": 6,
    "stock": 80,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "calmante",
      "viral",
      "top ventas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000016",
    "slug": "skin1004-madagascar-centella-ampoule-foam-125ml",
    "title": "SKIN1004 Madagascar Centella Ampoule Foam 125ml",
    "description": "Espuma limpiadora facial suave con pH 5.5 equilibrado enriquecida con centella de Madagascar.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule Foam 125 ml.webp",
    "retailPrice": 34500,
    "wholesalePrice": 25900,
    "wholesaleMinQuantity": 6,
    "stock": 45,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "espuma",
      "limpieza"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000017",
    "slug": "skin1004-madagascar-centella-poremizing-travel-kit-x4",
    "title": "SKIN1004 Madagascar Centella Poremizing Travel Kit x4",
    "description": "Kit de viaje con 4 pasos de la línea Poremizing con sal rosa del Himalaya para poros limpios y cerrados.",
    "categoryId": "10000000-0000-0000-0000-000000000008",
    "categoryName": "Kits de Viaje K-Beauty",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Poremizing Travel Kit x4 – Kit Para Poros.webp",
    "retailPrice": 41500,
    "wholesalePrice": 31000,
    "wholesaleMinQuantity": 6,
    "stock": 40,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "kit",
      "viaje",
      "poremizing"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000018",
    "slug": "skin1004-madagascar-centella-probio-cica-enrich-cream-50ml",
    "title": "SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50ml",
    "description": "Crema enriquecida con centella fermentada y probióticos botánicos para restaurar la barrera de la piel.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50 ml.webp",
    "retailPrice": 43000,
    "wholesalePrice": 32500,
    "wholesaleMinQuantity": 6,
    "stock": 36,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "probioticos",
      "crema"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000019",
    "slug": "skin1004-madagascar-centella-tea-trica-travel-kit-x4",
    "title": "SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4",
    "description": "Kit de viaje de 4 productos de la línea Tea-Trica (Árbol de Té y Centella) especial para piel con tendencia acneica.",
    "categoryId": "10000000-0000-0000-0000-000000000008",
    "categoryName": "Kits de Viaje K-Beauty",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp",
    "retailPrice": 41500,
    "wholesalePrice": 31000,
    "wholesaleMinQuantity": 6,
    "stock": 38,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "acne",
      "tea-tree",
      "kit"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000020",
    "slug": "skin1004-madagascar-centella-tone-brightening-travel-kit-x4",
    "title": "SKIN1004 Madagascar Centella Tone Brightening Travel Kit x4",
    "description": "Kit de 4 pasos iluminador con patente Madewhite y centella para emparejar el tono y borrar manchas.",
    "categoryId": "10000000-0000-0000-0000-000000000008",
    "categoryName": "Kits de Viaje K-Beauty",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Tone Brightening Travel Kit – Kit Coreano x4.webp",
    "retailPrice": 41500,
    "wholesalePrice": 31000,
    "wholesaleMinQuantity": 6,
    "stock": 35,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "iluminador",
      "kit"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000021",
    "slug": "skin1004-poremizing-quick-clay-stick-mask-27g",
    "title": "SKIN1004 Poremizing Quick Clay Stick Mask 27g",
    "description": "Mascarilla de arcilla en barra de aplicación rápida sin manchar las manos con barro rojo y sal del Himalaya.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/SKIN1004 Poremizing Quick Clay Stick Mask 27g – Mascarilla Para Poros.webp",
    "retailPrice": 36900,
    "wholesalePrice": 27500,
    "wholesaleMinQuantity": 6,
    "stock": 42,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "k-beauty",
      "skin1004",
      "stick",
      "arcilla",
      "mascarilla"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000022",
    "slug": "karseell-collagen-hair-mask-500ml",
    "title": "Karseell Collagen Hair Mask 500ml",
    "description": "El tratamiento viral para el cabello. Mascarilla con esencia de colágeno, aceite de argán y maca para reparación total.",
    "categoryId": "10000000-0000-0000-0000-000000000004",
    "categoryName": "Cuidado Capilar",
    "imageUrl": "/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp",
    "retailPrice": 43500,
    "wholesalePrice": 31900,
    "wholesaleMinQuantity": 4,
    "stock": 120,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "capilar",
      "colageno",
      "karseell",
      "viral",
      "top ventas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000023",
    "slug": "apple-iphone-13-128gb-meia-noite-black",
    "title": "Apple iPhone 13 128GB - Meia Noite / Black",
    "description": "Apple iPhone 13 128GB liberado de fábrica. Pantalla Super Retina XDR OLED 6.1\", chip A15 Bionic, cámara doble 12MP y batería al 100%.",
    "categoryId": "10000000-0000-0000-0000-000000000002",
    "categoryName": "Smartphones & Tecnología",
    "imageUrl": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 680000,
    "wholesalePrice": 545000,
    "wholesaleMinQuantity": 2,
    "stock": 15,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "apple",
      "iphone",
      "smartphone",
      "tecnologia"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000024",
    "slug": "apple-iphone-13-pro-max-256gb-sierra-blue",
    "title": "Apple iPhone 13 Pro Max 256GB - Sierra Blue",
    "description": "Apple iPhone 13 Pro Max 256GB. Pantalla ProMotion 120Hz de 6.7\", triple cámara con sensor LiDAR, zoom óptico 3x y chasis de acero inoxidable.",
    "categoryId": "10000000-0000-0000-0000-000000000002",
    "categoryName": "Smartphones & Tecnología",
    "imageUrl": "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 895000,
    "wholesalePrice": 740000,
    "wholesaleMinQuantity": 2,
    "stock": 10,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "apple",
      "iphone",
      "pro-max",
      "tecnologia"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000025",
    "slug": "apple-iphone-12-128gb-white",
    "title": "Apple iPhone 12 128GB - White",
    "description": "Apple iPhone 12 128GB liberado. Pantalla OLED 6.1\", conectividad 5G, chip A14 Bionic, compatible con MagSafe.",
    "categoryId": "10000000-0000-0000-0000-000000000002",
    "categoryName": "Smartphones & Tecnología",
    "imageUrl": "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 495000,
    "wholesalePrice": 395000,
    "wholesaleMinQuantity": 2,
    "stock": 20,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "apple",
      "iphone",
      "oportunidad"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000026",
    "slug": "total-tools-taladro-percutor-inalambrico-20v-li-ion",
    "title": "Total Tools Taladro Percutor Inalámbrico 20V Li-Ion",
    "description": "Taladro percutor a batería 20V con 2 velocidades mecánicas, mandril metálico autoajustable de 13mm, 2 baterías y maletín de transporte.",
    "categoryId": "10000000-0000-0000-0000-000000000003",
    "categoryName": "Herramientas & Equipamiento",
    "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 115000,
    "wholesalePrice": 89000,
    "wholesaleMinQuantity": 3,
    "stock": 25,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total-tools",
      "inalambrico",
      "taladro",
      "herramientas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000027",
    "slug": "total-tools-amoladora-angular-750w-115mm",
    "title": "Total Tools Amoladora Angular 750W 115mm",
    "description": "Amoladora angular profesional de 750W para discos de 115mm (4-1/2\"). Bobinado 100% de cobre para uso continuo.",
    "categoryId": "10000000-0000-0000-0000-000000000003",
    "categoryName": "Herramientas & Equipamiento",
    "imageUrl": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 62000,
    "wholesalePrice": 48000,
    "wholesaleMinQuantity": 4,
    "stock": 30,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total-tools",
      "amoladora",
      "equipamiento"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000028",
    "slug": "wadfow-set-de-herramientas-120-piezas-con-valija",
    "title": "Wadfow Set de Herramientas 120 Piezas con Valija",
    "description": "Kit completo de tubos, llaves combinadas, destornilladores, pinzas y alicates en valija reforzada de alto impacto.",
    "categoryId": "10000000-0000-0000-0000-000000000003",
    "categoryName": "Herramientas & Equipamiento",
    "imageUrl": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80",
    "retailPrice": 128000,
    "wholesalePrice": 99000,
    "wholesaleMinQuantity": 2,
    "stock": 18,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "wadfow",
      "set-herramientas",
      "valija"
    ],
    "featured": true,
    "wholesaleOnly": false
  }
];

export const demoAdminData: AdminDashboardData = {
  source: "demo",
  stats: {
    revenue: 4850000,
    orders: 14,
    customers: 8,
    products: demoProducts.length,
  },
  customers: [
    {
      id: "cust-1",
      fullName: "Maximo Calamante",
      email: "maximocalamante14@gmail.com",
      role: "admin",
      customerTier: "wholesale",
      createdAt: "2026-06-17T16:50:48.308Z",
      ordersCount: 4,
      totalSpent: 1250000,
      businessName: "MYA Importaciones",
      cuit: "20-41234567-9",
      isApprovedWholesale: true,
    },
    {
      id: "cust-2",
      fullName: "Sofia Martinez",
      email: "sofia.skincare@gmail.com",
      role: "customer",
      customerTier: "wholesale",
      createdAt: "2026-07-02T11:20:00.000Z",
      ordersCount: 3,
      totalSpent: 580000,
      businessName: "Glow Studio",
      cuit: "27-38492019-4",
      isApprovedWholesale: true,
    },
    {
      id: "cust-3",
      fullName: "Lucas Ferreyra",
      email: "lucas.tech@outlook.com",
      role: "customer",
      customerTier: "retail",
      createdAt: "2026-08-10T14:15:00.000Z",
      ordersCount: 2,
      totalSpent: 740000,
      isApprovedWholesale: false,
    },
  ],
  orders: [
    {
      id: "ord-90124",
      customerName: "Sofia Martinez",
      customerEmail: "sofia.skincare@gmail.com",
      channel: "wholesale",
      status: "paid",
      total: 345000,
      paymentMethod: "transferencia",
      createdAt: "2026-09-18T16:30:00.000Z",
      items: [
        { productTitle: "Medicube Collagen Jelly Cream 50ml", quantity: 6, unitPrice: 37500 },
        { productTitle: "SKIN1004 Madagascar Centella Ampoule 55ml", quantity: 6, unitPrice: 28500 },
      ],
    },
    {
      id: "ord-90123",
      customerName: "Lucas Ferreyra",
      customerEmail: "lucas.tech@outlook.com",
      channel: "retail",
      status: "shipped",
      total: 680000,
      paymentMethod: "transferencia",
      createdAt: "2026-09-17T10:15:00.000Z",
      items: [
        { productTitle: "Apple iPhone 13 128GB - Meia Noite / Black", quantity: 1, unitPrice: 680000 },
      ],
    },
    {
      id: "ord-90122",
      customerName: "Valeria Gomez",
      customerEmail: "valeria.g@gmail.com",
      channel: "retail",
      status: "delivered",
      total: 43500,
      paymentMethod: "mercado_pago",
      createdAt: "2026-09-15T19:40:00.000Z",
      items: [
        { productTitle: "Karseell Collagen Hair Mask 500ml", quantity: 1, unitPrice: 43500 },
      ],
    },
  ],
  products: demoProducts,
  categories: demoCategories,
  stockLogs: [
    {
      id: "log-1",
      productId: demoProducts[0].id,
      productTitle: demoProducts[0].title,
      changeAmount: 45,
      previousStock: 0,
      newStock: 45,
      reason: "creacion",
      createdAt: "2026-09-19T10:00:00.000Z",
    },
  ],
};

export const demoOrders = demoAdminData.orders;


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
    "description": "Skincare y cosmética coreana 100% original directo de Atacado USA Cosméticos. Sérums, tónicos, cremas virales y protectores de las mejores marcas de Seúl.",
    "imageUrl": "/products/Medicube Collagen Jelly Cream 50 ml.webp",
    "wholesaleOnly": false,
    "displayOrder": 1
  },
  {
    "id": "10000000-0000-0000-0000-000000000004",
    "name": "Cuidado Capilar",
    "slug": "cuidado-capilar",
    "parentId": null,
    "description": "Mascarillas de colágeno y tratamientos capilares virales Karseell Maca Essence de restauración profunda.",
    "imageUrl": "/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp",
    "wholesaleOnly": false,
    "displayOrder": 2
  },
  {
    "id": "10000000-0000-0000-0000-000000000003",
    "name": "Herramientas & Equipamiento",
    "slug": "herramientas-equipamiento",
    "parentId": null,
    "description": "Línea oficial industrial Total Tools & Wadfow directo de Total Herramientas Oficial Paraguay para talleres, obras y el hogar.",
    "imageUrl": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80",
    "wholesaleOnly": false,
    "displayOrder": 3
  },
  {
    "id": "10000000-0000-0000-0000-000000000005",
    "name": "Sérums & Ampollas",
    "slug": "serums-ampollas",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Concentrados activos faciales de alta penetración: Centella Asiatica, Exosomas, Retinol y Niacinamida.",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp",
    "wholesaleOnly": false,
    "displayOrder": 4
  },
  {
    "id": "10000000-0000-0000-0000-000000000006",
    "name": "Cremas & Mascarillas",
    "slug": "cremas-mascarillas",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Tratamientos hidratantes y reparadores con colágeno, PDRN y ceramidas para efecto Glass Skin.",
    "imageUrl": "/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp",
    "wholesaleOnly": false,
    "displayOrder": 5
  },
  {
    "id": "10000000-0000-0000-0000-000000000007",
    "name": "Limpieza & Exfoliantes",
    "slug": "limpieza-exfoliantes",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Aceites limpiadores puros, espumas suaves y pads con BHA para limpieza profunda de poros.",
    "imageUrl": "/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp",
    "wholesaleOnly": false,
    "displayOrder": 6
  },
  {
    "id": "10000000-0000-0000-0000-000000000008",
    "name": "Kits de Viaje K-Beauty",
    "slug": "kits-de-viaje-k-beauty",
    "parentId": "10000000-0000-0000-0000-000000000001",
    "description": "Sets completos de 4 pasos de SKIN1004 para probar o llevar de viaje.",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp",
    "wholesaleOnly": false,
    "displayOrder": 7
  },
  {
    "id": "10000000-0000-0000-0000-000000000033",
    "name": "Herramientas a Batería 20V Li-Ion",
    "slug": "herramientas-a-bateria-20v",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Línea inalámbrica Total Share 20V: atornilladores, taladros percutores y llaves de impacto sin cables.",
    "imageUrl": "/products/tools/584722.jpg",
    "wholesaleOnly": false,
    "displayOrder": 8
  },
  {
    "id": "10000000-0000-0000-0000-000000000012",
    "name": "Amoladoras, Pulidoras & Rectificadoras",
    "slug": "amoladoras-pulidoras",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Amoladoras angulares 115mm, 125mm y 230mm profesionales para corte y desbaste pesado.",
    "imageUrl": "/products/tools/501897.jpg",
    "wholesaleOnly": false,
    "displayOrder": 9
  },
  {
    "id": "10000000-0000-0000-0000-000000000011",
    "name": "Taladros, Rotomartillos & Demolición",
    "slug": "taladros-rotomartillos",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Rotomartillos SDS Plus y martillos demoledores de alta potencia para hormigón y mampostería.",
    "imageUrl": "/products/tools/615259.jpg",
    "wholesaleOnly": false,
    "displayOrder": 10
  },
  {
    "id": "10000000-0000-0000-0000-000000000014",
    "name": "Sierras Circulares, Caladoras & de Banco",
    "slug": "sierras-circulares-caladoras",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Sierras circulares de 1400W, caladoras con guía láser e ingletadoras para carpintería.",
    "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
    "wholesaleOnly": false,
    "displayOrder": 11
  },
  {
    "id": "10000000-0000-0000-0000-000000000018",
    "name": "Hidrolavadoras de Alta Presión",
    "slug": "hidrolavadoras-alta-presion",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Equipos de lavado de alta presión de 1400W a 2000W para talleres, vehículos y limpieza pesada.",
    "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    "wholesaleOnly": false,
    "displayOrder": 12
  },
  {
    "id": "10000000-0000-0000-0000-000000000016",
    "name": "Compresores de Aire & Neumática",
    "slug": "compresores-aire-neumatica",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Compresores monofásicos de 24L y 50L con accesorios de inflado y pistolas de pintar.",
    "imageUrl": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    "wholesaleOnly": false,
    "displayOrder": 13
  },
  {
    "id": "10000000-0000-0000-0000-000000000017",
    "name": "Soldadoras & Inverter",
    "slug": "soldadoras-inverter",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Soldadoras inverter compactas MMA/TIG con display digital y tecnología anti-stick.",
    "imageUrl": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80",
    "wholesaleOnly": false,
    "displayOrder": 14
  },
  {
    "id": "10000000-0000-0000-0000-000000000021",
    "name": "Kits & Cajas de Herramientas Completas",
    "slug": "kits-cajas-herramientas",
    "parentId": "10000000-0000-0000-0000-000000000003",
    "description": "Valijas de herramientas mecánicas de 120 piezas Wadfow y cajas metálicas reforzadas Total Tools.",
    "imageUrl": "/products/tools/584142.jpg",
    "wholesaleOnly": false,
    "displayOrder": 15
  }
];

export const demoProducts: Product[] = [
  {
    "id": "20000000-0000-0000-0000-000000000001",
    "slug": "celimax-heartleaf-bha-peeling-pad-60-pads",
    "title": "Celimax Heartleaf BHA Peeling Pad 60 Pads",
    "description": "Discos exfoliantes faciales coreanos con BHA y extracto de Heartleaf. Limpian impurezas y destapan poros sin irritar la barrera de la piel. Origen: Atacado USA Cosméticos. 100% Original.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/Celimax Heartleaf BHA Peeling Pad 60 Pads – Pads Exfoliantes Coreanos.webp",
    "retailPrice": 44900,
    "wholesalePrice": 32900,
    "wholesaleMinQuantity": 3,
    "stock": 24,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "celimax",
      "exfoliante",
      "skincare",
      "k-beauty",
      "bha"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000002",
    "slug": "celimax-retinal-shot-tightening-booster-15ml",
    "title": "Celimax Retinal Shot Tightening Booster 15ml",
    "description": "Booster facial coreano concentrado con Retinal A de alta tolerancia. Estimula la producción de colágeno y afina líneas de expresión. Origen: Atacado USA Cosméticos.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Celimax Retinal Shot Tightening Booster 15ml – Retinal Coreano.webp",
    "retailPrice": 39900,
    "wholesalePrice": 29000,
    "wholesaleMinQuantity": 3,
    "stock": 18,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "celimax",
      "retinal",
      "serum",
      "anti-edad",
      "k-beauty"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000003",
    "slug": "celimax-retinol-shot-tightening-serum-30ml",
    "title": "Celimax Retinol Shot Tightening Serum 30ml",
    "description": "Sérum intensivo con Retinol encapsulado para máxima firmeza y luminosidad sin descamación. Ideal para rutina nocturna anti-edad.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Celimax Retinol Shot Tightening Serum 30ml – Sérum Facial Retinol.webp",
    "retailPrice": 49900,
    "wholesalePrice": 36500,
    "wholesaleMinQuantity": 3,
    "stock": 22,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "celimax",
      "retinol",
      "serum",
      "firmeza",
      "k-beauty"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000004",
    "slug": "dr-althea-147-barrier-cream-50ml",
    "title": "Dr. Althea 147 Barrier Cream 50ml",
    "description": "Crema reparadora de barrera cutánea con ceramidas y extractos botánicos. Alivia rojeces, picazón y deshidratación severa.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp",
    "retailPrice": 49900,
    "wholesalePrice": 36500,
    "wholesaleMinQuantity": 3,
    "stock": 30,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "dr althea",
      "crema",
      "ceramidas",
      "barrera",
      "k-beauty"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000005",
    "slug": "dr-althea-345-relief-cream-mask-pack-x4",
    "title": "Dr. Althea 345 Relief Cream Mask – Pack x4",
    "description": "Pack de 4 mascarillas faciales de algodón impregnadas con la famosa crema 345 Relief Cream. Calma instantánea para brotes y rojeces.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr Althea 345 Relief Cream Mask – Mascarillas Faciales Pack x4.webp",
    "retailPrice": 36900,
    "wholesalePrice": 26900,
    "wholesaleMinQuantity": 3,
    "stock": 25,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "dr althea",
      "mascarilla",
      "sheet mask",
      "calmante",
      "pack"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000006",
    "slug": "dr-althea-pdrn-reju-5000-cream-20g",
    "title": "Dr. Althea PDRN Reju 5000 Cream 20g",
    "description": "Tratamiento dermatológico avanzado con PDRN (ADN de salmón) para regeneración celular, cicatrización y firmeza profunda.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Dr. Althea PDRN Reju 5000 Cream 20 g.webp",
    "retailPrice": 55900,
    "wholesalePrice": 40900,
    "wholesaleMinQuantity": 2,
    "stock": 15,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "dr althea",
      "pdrn",
      "regenerador",
      "anti-edad",
      "k-beauty"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000007",
    "slug": "medicube-collagen-jelly-cream-50ml",
    "title": "Medicube Collagen Jelly Cream 50ml",
    "description": "La crema viral de textura gelatina con colágeno liofilizado de Medicube. Deja la piel con el codiciado brillo 'Glass Skin' coreano de forma inmediata.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube Collagen Jelly Cream 50 ml.webp",
    "retailPrice": 57900,
    "wholesalePrice": 41900,
    "wholesaleMinQuantity": 3,
    "stock": 40,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "medicube",
      "colageno",
      "jelly cream",
      "glass skin",
      "viral"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000008",
    "slug": "medicube-exosome-shot-2000-30ml",
    "title": "Medicube One Day Exosome Shot 2000 30ml",
    "description": "Tratamiento intensivo de poros con micro-agujas biológicas de exosomas. Reduce el tamaño de los poros en 24 horas.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Medicube Exosome Shot 2000 30ml – Sérum Facial Para Poros y Textura.webp",
    "retailPrice": 58900,
    "wholesalePrice": 42900,
    "wholesaleMinQuantity": 2,
    "stock": 20,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "medicube",
      "exosomas",
      "poros",
      "shot 2000",
      "serum"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000010",
    "slug": "medicube-one-day-exosome-shot-7500-30ml",
    "title": "Medicube One Day Exosome Shot 7500 30ml",
    "description": "La concentración más potente de micro-exosomas de Medicube. Efecto peeling y regenerador profesional en casa.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/Medicube One Day Exosome Shot 7500 30 ml.webp",
    "retailPrice": 78900,
    "wholesalePrice": 57900,
    "wholesaleMinQuantity": 2,
    "stock": 12,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "medicube",
      "exosomas",
      "shot 7500",
      "dermatologico",
      "viral"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000011",
    "slug": "medicube-pdrn-pink-collagen-capsule-cream-55g",
    "title": "Medicube PDRN Pink Collagen Capsule Cream 55g",
    "description": "Crema en cápsulas rosas de colágeno y PDRN. Aporta elasticidad, brillo y unifica el tono de piel apagada.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/Medicube PDRN Pink Collagen Capsule Cream 55g – Crema Facial Coreana.webp",
    "retailPrice": 62900,
    "wholesalePrice": 45900,
    "wholesaleMinQuantity": 2,
    "stock": 18,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "medicube",
      "pdrn",
      "capsule cream",
      "colageno",
      "pink"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000012",
    "slug": "skin1004-centella-light-cleansing-oil-200ml",
    "title": "SKIN1004 Centella Light Cleansing Oil 200ml",
    "description": "Aceite desmaquillante y limpiador ultraligero con Centella Asiática de Madagascar. Disuelve maquillaje waterproof y protector solar sin tapar poros.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp",
    "retailPrice": 46900,
    "wholesalePrice": 34000,
    "wholesaleMinQuantity": 3,
    "stock": 35,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "skin1004",
      "cleansing oil",
      "limpiador",
      "centella",
      "k-beauty"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000013",
    "slug": "skin1004-madagascar-centella-ampoule-55ml",
    "title": "SKIN1004 Madagascar Centella Ampoule 55ml",
    "description": "La ampolla número 1 de Corea del Sur. 100% extracto puro de Centella Asiática cosechada en Madagascar. Calma irritaciones, acné y repara la barrera cutánea.",
    "categoryId": "10000000-0000-0000-0000-000000000005",
    "categoryName": "Sérums & Ampollas",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp",
    "retailPrice": 47900,
    "wholesalePrice": 34900,
    "wholesaleMinQuantity": 3,
    "stock": 50,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "skin1004",
      "centella",
      "ampoule",
      "calmante",
      "top ventas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000014",
    "slug": "skin1004-madagascar-centella-ampoule-foam-125ml",
    "title": "SKIN1004 Madagascar Centella Ampoule Foam 125ml",
    "description": "Espuma limpiadora facial con pH 5 equilibrado y 33% de extracto de Centella. Limpia en profundidad sin dejar la piel tirante ni reseca.",
    "categoryId": "10000000-0000-0000-0000-000000000007",
    "categoryName": "Limpieza & Exfoliantes",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Ampoule Foam 125 ml.webp",
    "retailPrice": 36900,
    "wholesalePrice": 26900,
    "wholesaleMinQuantity": 3,
    "stock": 28,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "skin1004",
      "espuma limpiadora",
      "foam",
      "centella",
      "k-beauty"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000015",
    "slug": "skin1004-madagascar-centella-probio-cica-enrich-cream-50ml",
    "title": "SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50ml",
    "description": "Crema nutritiva enriquecida con Centella fermentada y probióticos. Rellena la barrera cutánea debilitada y aporta confort inmediato a pieles secas o reactivas.",
    "categoryId": "10000000-0000-0000-0000-000000000006",
    "categoryName": "Cremas & Mascarillas",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50 ml.webp",
    "retailPrice": 48900,
    "wholesalePrice": 35500,
    "wholesaleMinQuantity": 3,
    "stock": 20,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "skin1004",
      "probio-cica",
      "crema nutritiva",
      "probioticos",
      "k-beauty"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000016",
    "slug": "skin1004-madagascar-centella-travel-kit-x4",
    "title": "SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4",
    "description": "Kit completo de 4 pasos de la línea Tea-Trica para pieles con acné y brotes: Limpiador, Tónico, Ampolla y Crema en formato viaje con estuche oficial.",
    "categoryId": "10000000-0000-0000-0000-000000000008",
    "categoryName": "Kits de Viaje K-Beauty",
    "imageUrl": "/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp",
    "retailPrice": 51900,
    "wholesalePrice": 37900,
    "wholesaleMinQuantity": 2,
    "stock": 24,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "skin1004",
      "travel kit",
      "tea-trica",
      "acne",
      "kit completo"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000017",
    "slug": "karseell-collagen-hair-mask-500ml",
    "title": "Karseell Collagen Hair Mask 500ml",
    "description": "La mascarilla capilar más viral del mundo. Tratamiento profesional con colágeno vegetal activo, aceite de argán y esencia de Maca para restaurar cabellos secos y dañados en 15 minutos.",
    "categoryId": "10000000-0000-0000-0000-000000000004",
    "categoryName": "Cuidado Capilar",
    "imageUrl": "/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp",
    "retailPrice": 39900,
    "wholesalePrice": 27500,
    "wholesaleMinQuantity": 3,
    "stock": 60,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "karseell",
      "colageno",
      "mascarilla capilar",
      "maca essence",
      "viral"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000020",
    "slug": "total-tools-taladro-percutor-inalambrico-20v",
    "title": "Total Tools Taladro Percutor Inalámbrico 20V Li-Ion",
    "description": "Taladro percutor inalámbrico Total Share 20V con mandril metálico de 13mm. Incluye 2 baterías de 2.0Ah de litio, cargador rápido de 1 hora, set de 50 accesorios y maletín de transporte reforzado.",
    "categoryId": "10000000-0000-0000-0000-000000000033",
    "categoryName": "Herramientas a Batería 20V Li-Ion",
    "imageUrl": "/products/tools/584722.jpg",
    "retailPrice": 189900,
    "wholesalePrice": 135000,
    "wholesaleMinQuantity": 2,
    "stock": 25,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "taladro",
      "percutor",
      "20v",
      "inalambrico",
      "herramientas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000021",
    "slug": "total-tools-amoladora-angular-850w-115mm",
    "title": "Total Tools Amoladora Angular 850W 115mm",
    "description": "Amoladora angular profesional Total Tools de 850W para discos de 115mm (4 1/2 pulgadas). Velocidad de 11.000 RPM, motor con blindaje antipolvo, mango auxiliar antivibratorio y protector ajustable.",
    "categoryId": "10000000-0000-0000-0000-000000000012",
    "categoryName": "Amoladoras, Pulidoras & Rectificadoras",
    "imageUrl": "/products/tools/501897.jpg",
    "retailPrice": 74900,
    "wholesalePrice": 53500,
    "wholesaleMinQuantity": 2,
    "stock": 35,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "amoladora",
      "850w",
      "115mm",
      "corte",
      "herramientas"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000022",
    "slug": "total-tools-amoladora-angular-20v-brushless",
    "title": "Total Tools Amoladora Angular 20V Brushless TAGLI21154",
    "description": "Amoladora angular a batería 20V con motor Brushless (sin carbones). Mayor autonomía y potencia para corte y desbaste sin cables. Compatible con toda la línea Total Share 20V.",
    "categoryId": "10000000-0000-0000-0000-000000000033",
    "categoryName": "Herramientas a Batería 20V Li-Ion",
    "imageUrl": "/products/tools/501897.jpg",
    "retailPrice": 184900,
    "wholesalePrice": 131000,
    "wholesaleMinQuantity": 2,
    "stock": 18,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "amoladora",
      "20v",
      "brushless",
      "inalambrica"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000023",
    "slug": "total-tools-rotomartillo-sds-plus-800w",
    "title": "Total Tools Rotomartillo SDS Plus 800W 2.5J",
    "description": "Rotomartillo electroneumático de 800W con encastre SDS Plus y 2.5 Joules de impacto. 3 funciones: taladro, percutor y cincelador. Incluye maletín, 3 mechas y 2 cinceles.",
    "categoryId": "10000000-0000-0000-0000-000000000011",
    "categoryName": "Taladros, Rotomartillos & Demolición",
    "imageUrl": "/products/tools/615259.jpg",
    "retailPrice": 172900,
    "wholesalePrice": 124000,
    "wholesaleMinQuantity": 2,
    "stock": 15,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "rotomartillo",
      "sds plus",
      "demolicion",
      "obra"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000024",
    "slug": "total-tools-sierra-circular-1400w-185mm",
    "title": "Total Tools Sierra Circular 1400W 185mm (7 1/4\")",
    "description": "Sierra circular para madera de 1400W y 4800 RPM. Profundidad de corte ajustable hasta 65mm a 90° y 44mm a 45°. Base de aluminio reforzada con guía paralela.",
    "categoryId": "10000000-0000-0000-0000-000000000014",
    "categoryName": "Sierras Circulares, Caladoras & de Banco",
    "imageUrl": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
    "retailPrice": 139900,
    "wholesalePrice": 99000,
    "wholesaleMinQuantity": 2,
    "stock": 20,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "sierra circular",
      "carpinteria",
      "madera",
      "corte"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000025",
    "slug": "total-tools-hidrolavadora-alta-presion-1800w",
    "title": "Total Tools Hidrolavadora Alta Presión 1800W 150 Bar",
    "description": "Hidrolavadora de alta presión con motor de 1800W y presión máxima de 150 Bar (2175 PSI). Sistema Auto Stop de corte automático, manguera de 5 metros y depósito de detergente incorporado.",
    "categoryId": "10000000-0000-0000-0000-000000000018",
    "categoryName": "Hidrolavadoras de Alta Presión",
    "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    "retailPrice": 199900,
    "wholesalePrice": 143000,
    "wholesaleMinQuantity": 2,
    "stock": 14,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "hidrolavadora",
      "lavado",
      "alta presion",
      "150 bar"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000026",
    "slug": "total-tools-compresor-aire-24-litros-2hp",
    "title": "Total Tools Compresor de Aire 24 Litros 2HP",
    "description": "Compresor de aire con tanque de 24 litros y motor monofásico de 2 HP. Presión de trabajo de 8 Bar (116 PSI) con doble manómetro y regulador de presión para pistolas de pintura y herramientas neumáticas.",
    "categoryId": "10000000-0000-0000-0000-000000000016",
    "categoryName": "Compresores de Aire & Neumática",
    "imageUrl": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    "retailPrice": 249000,
    "wholesalePrice": 179000,
    "wholesaleMinQuantity": 1,
    "stock": 10,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "compresor",
      "24 litros",
      "neumatica",
      "taller"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000027",
    "slug": "total-tools-soldadora-inverter-mma-160a",
    "title": "Total Tools Soldadora Inverter MMA 160A Display Digital",
    "description": "Soldadora inverter compacta de 160 Amperes con tecnología IGBT y display digital. Soporta electrodos de hasta 4.0mm con funciones Hot Start, Arc Force y Anti-Stick.",
    "categoryId": "10000000-0000-0000-0000-000000000017",
    "categoryName": "Soldadoras & Inverter",
    "imageUrl": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80",
    "retailPrice": 184900,
    "wholesalePrice": 132000,
    "wholesaleMinQuantity": 2,
    "stock": 16,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "soldadora",
      "inverter",
      "160a",
      "herreria"
    ],
    "featured": false,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000028",
    "slug": "wadfow-set-de-herramientas-120-piezas",
    "title": "Wadfow Set de Herramientas Mecánicas 120 Piezas con Valija",
    "description": "Juego completo de herramientas manuales de 120 piezas en acero cromo vanadio (Cr-V). Incluye llaves crique de 1/4\" y 1/2\", tubos métricos, llaves combinadas, destornilladores y valija de aluminio reforzada.",
    "categoryId": "10000000-0000-0000-0000-000000000021",
    "categoryName": "Kits & Cajas de Herramientas Completas",
    "imageUrl": "/products/tools/584142.jpg",
    "retailPrice": 119900,
    "wholesalePrice": 86000,
    "wholesaleMinQuantity": 2,
    "stock": 30,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "wadfow",
      "set herramientas",
      "120 piezas",
      "valija",
      "taller"
    ],
    "featured": true,
    "wholesaleOnly": false
  },
  {
    "id": "20000000-0000-0000-0000-000000000029",
    "slug": "total-tools-caja-herramientas-metalica-3-niveles",
    "title": "Total Tools Caja de Herramientas Metálica 3 Niveles",
    "description": "Caja de herramientas metálica desplegable de 3 pisos tipo fuelle. Construida en chapa de acero de alta resistencia con pintura epoxi y manija de transporte.",
    "categoryId": "10000000-0000-0000-0000-000000000021",
    "categoryName": "Kits & Cajas de Herramientas Completas",
    "imageUrl": "/products/tools/584722.jpg",
    "retailPrice": 64900,
    "wholesalePrice": 46500,
    "wholesaleMinQuantity": 3,
    "stock": 25,
    "paymentMethods": [
      "transferencia",
      "tarjeta",
      "mercado_pago",
      "efectivo"
    ],
    "tags": [
      "total tools",
      "caja herramientas",
      "metalica",
      "organizacion",
      "taller"
    ],
    "featured": false,
    "wholesaleOnly": false
  }
];

export const demoAdminData: AdminDashboardData = {
  source: "demo",
  stats: {
    revenue: 8420000,
    orders: 142,
    customers: 34,
    products: demoProducts.length,
  },
  customers: [
    {
      id: "usr-001",
      email: "maximocalamante14@gmail.com",
      fullName: "Máximo Calamante",
      role: "admin",
      customerTier: "wholesale",
      isApprovedWholesale: true,
      createdAt: "2026-08-01T10:00:00.000Z",
      ordersCount: 28,
      totalSpent: 4850000,
    },
    {
      id: "usr-002",
      email: "ferreteria.tandil@gmail.com",
      fullName: "Ferretería El Progreso Tandil",
      role: "customer",
      customerTier: "wholesale",
      isApprovedWholesale: true,
      createdAt: "2026-08-15T12:30:00.000Z",
      ordersCount: 12,
      totalSpent: 1680000,
    },
    {
      id: "usr-003",
      email: "estetica.azul@gmail.com",
      fullName: "Showroom Skincare Azul",
      role: "customer",
      customerTier: "wholesale",
      isApprovedWholesale: true,
      createdAt: "2026-08-20T14:15:00.000Z",
      ordersCount: 9,
      totalSpent: 940000,
    },
    {
      id: "usr-004",
      email: "camila.estetica@hotmail.com",
      fullName: "Camila Gomez",
      role: "customer",
      customerTier: "retail",
      isApprovedWholesale: false,
      createdAt: "2026-09-02T18:45:00.000Z",
      ordersCount: 3,
      totalSpent: 112000,
    },
  ],
  orders: [
    {
      id: "ord-90124",
      customerName: "Ferretería El Progreso Tandil",
      customerEmail: "ferreteria.tandil@gmail.com",
      channel: "wholesale",
      status: "paid",
      total: 345000,
      paymentMethod: "transferencia",
      createdAt: "2026-09-18T16:30:00.000Z",
      items: [
        { productTitle: "Total Tools Taladro Percutor Inalámbrico 20V Li-Ion", quantity: 2, unitPrice: 135000 },
        { productTitle: "Total Tools Amoladora Angular 850W 115mm", quantity: 2, unitPrice: 53500 },
      ],
    },
    {
      id: "ord-90123",
      customerName: "Showroom Skincare Azul",
      customerEmail: "estetica.azul@gmail.com",
      channel: "wholesale",
      status: "shipped",
      total: 215000,
      paymentMethod: "transferencia",
      createdAt: "2026-09-17T10:15:00.000Z",
      items: [
        { productTitle: "Medicube Collagen Jelly Cream 50ml", quantity: 3, unitPrice: 41900 },
        { productTitle: "SKIN1004 Madagascar Centella Ampoule 55ml", quantity: 3, unitPrice: 34900 },
      ],
    },
    {
      id: "ord-90122",
      customerName: "Camila Gomez",
      customerEmail: "camila.estetica@hotmail.com",
      channel: "retail",
      status: "delivered",
      total: 39900,
      paymentMethod: "mercado_pago",
      createdAt: "2026-09-15T19:40:00.000Z",
      items: [
        { productTitle: "Karseell Collagen Hair Mask 500ml", quantity: 1, unitPrice: 39900 },
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
      changeAmount: 50,
      previousStock: 0,
      newStock: 50,
      reason: "creacion",
      createdAt: "2026-09-19T10:00:00.000Z",
    },
  ],
};

export const demoOrders = demoAdminData.orders;

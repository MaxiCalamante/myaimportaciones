import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getProductBySlug } from "@/lib/storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache for resized logo to optimize response time
let cachedLogoBase64: string | null = null;

async function readPublicAsset(relativePath: string): Promise<Buffer | null> {
  const clean = relativePath.replace(/^\//, "");
  const p1 = join(process.cwd(), "public", clean);
  const b1 = await readFile(p1).catch(() => null);
  if (b1) return b1;
  const p2 = join(process.cwd(), "Tienda WEB", "public", clean);
  return readFile(p2).catch(() => null);
}

async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const buf = await readPublicAsset("logo.png");
    if (!buf) return null;
    const resized = await sharp(buf).resize({ height: 50 }).png({ quality: 90 }).toBuffer();
    cachedLogoBase64 = "data:image/png;base64," + resized.toString("base64");
    return cachedLogoBase64;
  } catch {
    return null;
  }
}

async function loadProductImageBase64(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  try {
    let buf: Buffer | null = null;
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      buf = await readPublicAsset(trimmed);
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const res = await fetch(trimmed, {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "image/*" },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        buf = Buffer.from(arr);
      }
    }

    if (!buf || buf.length === 0) return null;

    const resized = await sharp(buf)
      .resize(360, 360, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png({ quality: 90 })
      .toBuffer();

    return "data:image/png;base64," + resized.toString("base64");
  } catch {
    return null;
  }
}

function formatPriceNumber(raw: string | number | null | undefined): string {
  if (!raw) return "";
  const num = typeof raw === "string" ? Number(raw.replace(/[^\d.]/g, "")) : raw;
  if (!num || isNaN(num) || num <= 0) return "";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(num);
}

function truncateText(str: string, maxLen: number): string {
  const clean = (str || "").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trim() + "…";
}

// Crisp Vector SVG Icons for Satori (100% offline, zero external font latency)
const CheckIcon = ({ color = "#34d399", size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TruckIcon = ({ color = "#38bdf8", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const CardIcon = ({ color = "#34d399", size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const ShieldIcon = ({ color = "#38bdf8", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const SparklesIcon = ({ color = "#38bdf8", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </svg>
);

const MapPinIcon = ({ color = "#38bdf8", size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let tipo = (searchParams.get("tipo") || searchParams.get("type") || "").toLowerCase();
  const slug = searchParams.get("slug") || "";
  let titulo = searchParams.get("titulo") || searchParams.get("title") || "";
  let precio = searchParams.get("precio") || searchParams.get("price") || "";
  let marca = searchParams.get("marca") || searchParams.get("brand") || "";
  let cat = searchParams.get("cat") || searchParams.get("categoria") || searchParams.get("category") || "";
  let img = searchParams.get("img") || searchParams.get("image") || "";
  const desc = searchParams.get("desc") || searchParams.get("description") || "";

  // Auto-detect mode if not explicit
  if (!tipo) {
    if (slug || (titulo && precio)) {
      tipo = "producto";
    } else if (cat || marca) {
      tipo = "categoria";
    } else {
      tipo = "tienda";
    }
  }

  // If it's a product and some data is missing, try looking it up by slug
  if (tipo === "producto" && slug && (!titulo || !precio || !img)) {
    try {
      const product = await getProductBySlug(slug);
      if (product) {
        if (!titulo) titulo = product.title;
        if (!precio && product.retailPrice) precio = String(product.retailPrice);
        if (!marca && product.brand) marca = product.brand;
        if (!cat && product.categoryName) cat = product.categoryName;
        if (!img && product.imageUrl) img = product.imageUrl;
      }
    } catch {
      // Gracefully continue with provided or fallback data
    }
  }

  const logoBase64 = await getLogoBase64();

  // -------------------------------------------------------------
  // TEMPLATE 1: PRODUCT CARD (Foto, Título, Precio, Marca, MYA Branding)
  // -------------------------------------------------------------
  if (tipo === "producto" || tipo === "product") {
    const productImgBase64 = await loadProductImageBase64(img);
    const formattedPrice = formatPriceNumber(precio);
    const displayTitle = truncateText(titulo || "Producto Original", 65);
    const displayCategory = truncateText((cat || "Catálogo Oficial").toUpperCase(), 25);
    const displayBrand = marca ? truncateText(marca.toUpperCase(), 18) : "";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "row",
            background: "linear-gradient(135deg, #07090e 0%, #0d1527 50%, #071e33 100%)",
            padding: "40px 48px",
            alignItems: "center",
            gap: 44,
            position: "relative",
          }}
        >
          {/* Top glowing accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 40%, #10b981 100%)",
            }}
          />

          {/* Left: Product Showcase Card */}
          <div
            style={{
              display: "flex",
              width: 440,
              height: 540,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 28,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
              position: "relative",
              padding: 20,
            }}
          >
            {/* Top-left: Original badge */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.35)",
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              <CheckIcon color="#34d399" size={13} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", letterSpacing: "0.05em" }}>
                100% ORIGINAL
              </span>
            </div>

            {/* Top-right: Brand Pill if present */}
            {displayBrand ? (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: 999,
                  padding: "5px 12px",
                  color: "#bae6fd",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {displayBrand}
              </div>
            ) : null}

            {/* White/Off-white high-contrast studio container for the product */}
            <div
              style={{
                display: "flex",
                width: 350,
                height: 350,
                borderRadius: 22,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              }}
            >
              {productImgBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productImgBase64} width={318} height={318} style={{ objectFit: "contain" }} alt={titulo} />
              ) : logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoBase64} width={200} height={90} style={{ objectFit: "contain" }} alt="MYA Importaciones" />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>MYA IMPORTACIONES</div>
              )}
            </div>

            {/* Bottom verified text */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldIcon color="#38bdf8" size={14} />
              <span>Importación oficial directa</span>
            </div>
          </div>

          {/* Right: Commercial Information & Branding */}
          <div
            style={{
              display: "flex",
              width: 618,
              height: 540,
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Top Bar: MYA Brand & Category */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {logoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoBase64} height={38} width={76} style={{ objectFit: "contain" }} alt="MYA" />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>MYA IMPORTACIONES</span>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(2, 132, 199, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: 999,
                    padding: "4px 12px",
                    color: "#38bdf8",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  TIENDA OFICIAL
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 999,
                  padding: "4px 14px",
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {displayCategory}
              </div>
            </div>

            {/* Center: Title & Price */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontSize: displayTitle.length > 50 ? 30 : displayTitle.length > 32 ? 34 : 40,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                }}
              >
                {displayTitle}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14 }}>
                {marca ? <span>Marca: {marca}</span> : null}
                {marca ? <span>·</span> : null}
                <span>Envíos asegurados a todo el país</span>
              </div>

              {/* Price Panel */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(2, 132, 199, 0.05) 100%)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  borderRadius: 20,
                  padding: "16px 24px",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.08em" }}>
                    PRECIO ONLINE
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: "0.05em" }}>
                    HASTA 3 CUOTAS · PAGOS SEGUROS
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  {formattedPrice ? (
                    <>
                      <span style={{ fontSize: 50, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>
                        $ {formattedPrice}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>
                        ARS
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#ffffff" }}>
                      CONSULTAR DISPONIBILIDAD
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Trust Highlights & Footer */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: 14,
                    padding: "10px 14px",
                    flex: 1,
                  }}
                >
                  <TruckIcon color="#38bdf8" size={20} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Envíos a todo el país</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Por Correo Argentino</span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: 14,
                    padding: "10px 14px",
                    flex: 1,
                  }}
                >
                  <CardIcon color="#34d399" size={20} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Pagos 100% Seguros</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Mercado Pago & Transf.</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <MapPinIcon color="#64748b" size={13} />
                  <span>Desde Tandil a toda la Argentina · Atención Máximo & Agustina</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>
                  myaimportaciones.com
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE 2: CATEGORY CARD (Rubro, Marca, Catálogo Oficial)
  // -------------------------------------------------------------
  if (tipo === "categoria" || tipo === "category" || tipo === "catalogo") {
    const displayCategoryTitle = truncateText(cat || (marca ? `Productos ${marca}` : "Catálogo Oficial"), 45);
    const displayDesc = truncateText(
      desc || (marca
        ? `Explorá la selección oficial de ${marca} en MYA Importaciones. Productos 100% originales con precios en pesos y envíos a todo el país.`
        : "Descubrí productos originales importados. Cosmética coreana, tecnología, cuidado capilar y herramientas con envíos a toda Argentina."),
      170,
    );

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #07090e 0%, #0d1527 50%, #061c30 100%)",
            padding: "48px 56px",
            position: "relative",
          }}
        >
          {/* Top glowing accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 40%, #10b981 100%)",
            }}
          />

          {/* Top Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoBase64} height={46} width={92} style={{ objectFit: "contain" }} alt="MYA" />
              ) : null}
              <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "0.04em" }}>
                MYA IMPORTACIONES
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.35)",
                borderRadius: 999,
                padding: "6px 16px",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 999, background: "#34d399" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", letterSpacing: "0.06em" }}>
                CATÁLOGO OFICIAL VERIFICADO
              </span>
            </div>
          </div>

          {/* Hero Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              margin: "12px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                borderRadius: 999,
                padding: "6px 20px",
                color: "#38bdf8",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {marca ? `MARCA DESTACADA · ${marca.toUpperCase()}` : "RUBRO SELECCIONADO · PRODUCTOS ORIGINALES"}
            </div>

            <div
              style={{
                color: "#ffffff",
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                textAlign: "center",
                marginTop: 16,
                marginBottom: 12,
                lineHeight: 1.1,
              }}
            >
              {displayCategoryTitle}
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 21,
                textAlign: "center",
                maxWidth: 900,
                lineHeight: 1.4,
              }}
            >
              {displayDesc}
            </div>
          </div>

          {/* 3 Value Cards */}
          <div style={{ display: "flex", gap: 20 }}>
            <div
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 18,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckIcon color="#34d399" size={16} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>100% Originales</span>
              </div>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Marcas líderes con procedencia e importación verificada.</span>
            </div>

            <div
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 18,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TruckIcon color="#38bdf8" size={16} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Envíos a Toda Argentina</span>
              </div>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Despachos rápidos y seguros por Correo Argentino.</span>
            </div>

            <div
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 18,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CardIcon color="#34d399" size={16} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Precios en Pesos y Cuotas</span>
              </div>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Pagos protegidos con Mercado Pago y transferencia.</span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
              <MapPinIcon color="#64748b" size={14} />
              <span>MYA Importaciones · Tandil, Buenos Aires · Asesoramiento Máximo & Agustina</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>
              myaimportaciones.com/catalogo
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE 3: HOME / STORE CARD (Branding, Propuesta de Valor, Pilares)
  // -------------------------------------------------------------
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07090e 0%, #0d1527 50%, #082138 100%)",
          padding: "48px 56px",
          position: "relative",
        }}
      >
        {/* Top glowing accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 40%, #10b981 100%)",
          }}
        />

        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoBase64} height={50} width={100} style={{ objectFit: "contain" }} alt="MYA" />
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(2, 132, 199, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: 999,
                padding: "5px 14px",
                color: "#38bdf8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              TIENDA OFICIAL DE IMPORTACIONES
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 999,
              padding: "5px 16px",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <MapPinIcon color="#38bdf8" size={14} />
            <span>Tandil · Envíos a todo el país</span>
          </div>
        </div>

        {/* Center Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 58,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            MYA Importaciones
          </div>

          <div
            style={{
              color: "#38bdf8",
              fontSize: 25,
              fontWeight: 700,
              marginBottom: 12,
              letterSpacing: "-0.01em",
            }}
          >
            Productos originales para vos, tu hogar y tu negocio
          </div>

          <div
            style={{
              color: "#94a3b8",
              fontSize: 18,
              maxWidth: 860,
              lineHeight: 1.4,
              marginBottom: 20,
            }}
          >
            Skincare Coreano (K-Beauty) · Cuidado Capilar Profesional · Tecnología & Smartphones · Herramientas Industriales
          </div>

          {/* 4 Pillars Pills */}
          <div style={{ display: "flex", gap: 12 }}>
            {["Cosmética Coreana", "Electrónica & Apple", "Cuidado Capilar", "Herramientas Pro"].map((categoryName) => (
              <div
                key={categoryName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 999,
                  padding: "6px 16px",
                  color: "#f1f5f9",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <SparklesIcon color="#38bdf8" size={13} />
                <span>{categoryName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Trust Highlights */}
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { icon: <TruckIcon color="#38bdf8" size={16} />, title: "Envíos a todo el país" },
            { icon: <CardIcon color="#34d399" size={16} />, title: "Precios en pesos y cuotas" },
            { icon: <CheckIcon color="#38bdf8" size={16} />, title: "100% Originales" },
            { icon: <SparklesIcon color="#34d399" size={16} />, title: "Atención Máximo & Agustina" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "10px 14px",
                justifyContent: "center",
              }}
            >
              {item.icon}
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{item.title}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Tienda online minorista directa desde Tandil, Buenos Aires, Argentina
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
            myaimportaciones.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    },
  );
}

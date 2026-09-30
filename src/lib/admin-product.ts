import type { PaymentMethod } from "./types";

export const MAX_PRODUCT_IMAGES = 4;
export const MAX_UPLOAD_BYTES = 750_000;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const imageHosts = ["cdn.shopify.com", "images.unsplash.com", "atacadousa.com.py", "www.atacadousa.com.py", "totalherramientasoficial.com.py", "www.totalherramientasoficial.com.py"];
export function slugifyProduct(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}
export function validId(value: string) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Identificador inválido.");
  return value;
}
export function httpsUrl(value: string, label = "Enlace") {
  if (!value) return "";
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label}: ingresá una URL HTTPS completa.`); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error(`${label}: usá un enlace HTTPS sin credenciales ni puerto.`);
  return url.href;
}
export function productImageUrl(value: string) {
  if (!value) return "";
  if (/^\/(?!\/)[a-zA-Z0-9/_ .-]+\.(png|jpe?g|webp|avif)$/i.test(value)) return value;
  const url = new URL(httpsUrl(value, "Imagen"));
  if (!imageHosts.includes(url.hostname) && !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)) throw new Error("La imagen usa un dominio no admitido. Descargá la foto y subila desde galería.");
  return url.href;
}
export function validateImageFile(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || !file.size || file.size > MAX_UPLOAD_BYTES) throw new Error("Subí fotos JPG, PNG o WebP de hasta 750 KB por foto. El editor optimiza las fotos de tu celular.");
}
export async function validateImageContent(file: File) {
  validateImageFile(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!({ "image/jpeg": jpeg, "image/png": png, "image/webp": webp }[file.type])) throw new Error("El archivo no contiene una imagen válida.");
}
function text(form: FormData, key: string, max = 200) {
  const value = form.get(key);
  if (value !== null && typeof value !== "string") throw new Error(`Campo inválido: ${key}.`);
  const clean = (value ?? "").trim();
  if (clean.length > max) throw new Error(`El campo ${key} es demasiado largo.`);
  return clean;
}
function number(form: FormData, key: string, fallback: number, max: number, integer = false) {
  const raw = text(form, key, 30);
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) throw new Error(`Revisá el valor de ${key}.`);
  return value;
}
export function parseSpecifications(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  let parsed: unknown;
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try { parsed = JSON.parse(raw); } catch { throw new Error("Las especificaciones JSON son inválidas."); }
  } else {
    parsed = Object.fromEntries(raw.split("\n").filter(line => line.trim()).map(line => {
      const i = line.indexOf(":");
      if (i < 1) throw new Error("Escribí cada especificación como Nombre: valor.");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }));
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" || Object.keys(parsed).length > 40 || Object.entries(parsed).some(([k, v]) => !k.trim() || k.length > 80 || typeof v !== "string" || v.length > 3000 || ["__proto__", "constructor", "prototype"].includes(k))) throw new Error("Las especificaciones deben ser pares de nombre y texto.");
  return parsed as Record<string, string>;
}
export function parseProductForm(form: FormData, creating: boolean) {
  const title = text(form, "title", 200);
  if (title.length < 2) throw new Error("Ingresá un título de al menos 2 caracteres.");
  const categoryId = validId(text(form, "subcategory_id") || text(form, "category_id"));
  const retailPrice = number(form, "retail_price", 0, 9999999999.99);
  const active = form.get("is_active") === "on";
  if (active && retailPrice <= 0) throw new Error("Para publicar, el precio minorista debe ser mayor a cero.");
  const mode = text(form, "fulfillment_mode") || "supplier";
  if (!["supplier", "own_stock"].includes(mode)) throw new Error("Elegí una modalidad de disponibilidad válida.");
  const minimum = number(form, "wholesale_min_qty", 1, 100000, true);
  if (minimum < 1) throw new Error("El mínimo mayorista debe ser al menos una unidad.");
  const methods = form.getAll("payment_methods");
  const validMethods: PaymentMethod[] = ["transferencia", "tarjeta", "mercado_pago", "efectivo", "cuenta_corriente"];
  if (methods.some(m => !validMethods.includes(m as PaymentMethod))) throw new Error("Medio de pago inválido.");
  const specifications = parseSpecifications(text(form, "specifications", 30000));
  if (form.has("weight_kg")) {
    const weight = number(form, "weight_kg", 0, 1000);
    if (weight > 0) specifications.peso_kg = String(weight);
    else delete specifications.peso_kg;
  }
  const stock = creating ? number(form, "stock", 0, 100000, true) : undefined;
  if (creating && mode === "supplier" && stock) throw new Error("El stock físico se carga sólo para stock propio.");
  if (creating && stock && form.get("stock_confirmed") !== "on") throw new Error("Confirmá el conteo físico antes de cargar stock propio.");
  const rawCost = text(form, "supplier_live_price", 30);
  const tags = [...new Set(text(form, "tags", 1000).split(",").map(t => t.trim()).filter(t => t && !["en_stock", "en stock", "stock inmediato", "stock_inmediato"].includes(t.toLowerCase())))];
  const fields = {
    title, category_id: categoryId, description: text(form, "description", 10000) || null,
    retail_price: retailPrice, wholesale_price: number(form, "wholesale_price", 0, 9999999999.99), wholesale_min_qty: minimum,
    brand: text(form, "brand") || null, model: text(form, "model") || null, sku: text(form, "sku", 100) || null,
    source_url: httpsUrl(text(form, "source_url", 2000), "Proveedor") || null,
    supplier_live_price: rawCost ? number(form, "supplier_live_price", 0, 9999999999.99) : null,
    fulfillment_mode: mode as "supplier" | "own_stock", supplier_available: mode === "supplier" && form.get("supplier_available") === "on",
    payment_methods: methods.length ? [...new Set(methods)] as PaymentMethod[] : ["transferencia"] as PaymentMethod[],
    tags, specifications, warranty_terms: text(form, "warranty_terms", 3000) || null,
    is_active: active, is_featured: form.get("is_featured") === "on", is_wholesale_only: form.get("is_wholesale_only") === "on",
    updated_at: new Date().toISOString(),
  };
  const slug = slugifyProduct(text(form, "slug") || title);
  if (!slug) throw new Error("El título debe permitir generar un enlace de producto.");
  return { fields, slug, stock };
}

import { httpsUrl, validId } from "./admin-product";

export interface Supplier {
  id: string; name: string; contact_name: string | null; phone: string | null; email: string | null;
  website: string | null; notes: string | null; is_active: boolean; updated_at: string;
}
export function parseSupplier(form: FormData) {
  function field(key: string, max: number) {
    const raw = form.get(key);
    if (raw !== null && typeof raw !== "string") throw new Error("Dato de proveedor inválido.");
    const value = (raw ?? "").trim();
    if (value.length > max) throw new Error(`El campo ${key} es demasiado largo.`);
    return value;
  }
  const id = field("id", 36);
  if (id) validId(id);
  const name = field("name", 200);
  if (name.length < 2) throw new Error("Ingresá el nombre del proveedor.");
  const phone = field("phone", 40).replace(/[\s()+.-]/g, "");
  if (phone && !/^\d{8,15}$/.test(phone)) throw new Error("Ingresá el WhatsApp con código de país, sólo números (ej. 549…).");
  const email = field("email", 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Revisá el email del proveedor.");
  return { id, values: { name, contact_name: field("contact_name", 200) || null, phone: phone || null, email: email || null, website: httpsUrl(field("website", 2000), "Sitio del proveedor") || null, notes: field("notes", 5000) || null, is_active: form.get("is_active") === "on", updated_at: new Date().toISOString() } };
}

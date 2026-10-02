import { AdminFormError } from "./admin-action-result";
import { MAX_PRODUCT_IMAGES, productImageUrl, validateImageContent } from "./admin-product";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function prepareProductImages(db: SupabaseClient, form: FormData, existing: string[] = []) {
  const supplied = form.has("gallery_present");
  const kept = supplied ? form.getAll("keep_image_url").filter((value): value is string => typeof value === "string") : existing;
  if (kept.some(url => !existing.includes(url))) throw new AdminFormError("La galería cambió. Volvé a abrir la ficha.");
  const custom = String(form.get("custom_image_url") ?? "").trim();
  const urls = [...new Set([...kept, ...(custom ? [productImageUrl(custom)] : [])])];
  const files = [...form.getAll("images"), form.get("image")].filter((value): value is File => value instanceof File && value.size > 0);
  if (urls.length + files.length > MAX_PRODUCT_IMAGES) throw new AdminFormError(`Podés guardar hasta ${MAX_PRODUCT_IMAGES} fotos. Quitá alguna antes de agregar otra.`);
  // Validate every file before the first upload, avoiding partial uploads for invalid input.
  for (const file of files) await validateImageContent(file);
  const paths: string[] = [];
  try {
    for (const file of files) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "31536000" });
      if (error) throw new AdminFormError("No se pudo subir la foto. Revisá tu conexión y los permisos de almacenamiento.");
      paths.push(path);
      urls.push(db.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
  } catch (error) {
    if (paths.length) await db.storage.from("product-images").remove(paths);
    throw error;
  }
  return { urls, paths };
}

import { AdminFormError } from "./admin-action-result";
import { MAX_PRODUCT_IMAGES, productImageUrl, validateImageContent } from "./admin-product";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function prepareProductImages(db: SupabaseClient, form: FormData, existing: string[] = []) {
  const supplied = form.has("gallery_present");
  const kept = supplied ? form.getAll("keep_image_url").filter((value): value is string => typeof value === "string") : existing;
  if (existing.length > 0) {
    if (kept.some(url => !existing.includes(url))) throw new AdminFormError("La galería cambió. Volvé a abrir la ficha.");
  } else {
    for (const url of kept) productImageUrl(url);
  }
  const custom = String(form.get("custom_image_url") ?? "").trim();
  const urls = [...new Set([...kept, ...(custom ? [productImageUrl(custom)] : [])])];
  const files = [...form.getAll("images"), form.get("image")].filter((value): value is File => value instanceof File && value.size > 0);
  if (urls.length + files.length > MAX_PRODUCT_IMAGES) throw new AdminFormError(`Podés guardar hasta ${MAX_PRODUCT_IMAGES} fotos. Quitá alguna antes de agregar otra.`);
  // Validate every file before the first upload, avoiding partial uploads for invalid input.
  for (const file of files) await validateImageContent(file);
  const paths: string[] = [];
  const uploadedUrls: string[] = [];
  try {
    for (const file of files) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "31536000" });
      if (error) throw new AdminFormError("No se pudo subir la foto. Revisá tu conexión y los permisos de almacenamiento.");
      paths.push(path);
      const publicUrl = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      uploadedUrls.push(publicUrl);
      urls.push(publicUrl);
    }
  } catch (error) {
    if (paths.length) await db.storage.from("product-images").remove(paths);
    throw error;
  }

  // Handle visual gallery ordering if specified
  const orderTokens = form.getAll("gallery_order").filter((v): v is string => typeof v === "string");
  if (orderTokens.length > 0) {
    const finalUrls: string[] = [];
    for (const token of orderTokens) {
      if (token.startsWith("keep:")) {
        const u = token.slice("keep:".length);
        if (urls.includes(u) && !finalUrls.includes(u)) {
          finalUrls.push(u);
        }
      } else if (token.startsWith("upload:")) {
        const idx = parseInt(token.slice("upload:".length), 10);
        if (!isNaN(idx) && uploadedUrls[idx] && !finalUrls.includes(uploadedUrls[idx])) {
          finalUrls.push(uploadedUrls[idx]);
        }
      } else if (token === "custom" && custom) {
        const customUrl = productImageUrl(custom);
        if (urls.includes(customUrl) && !finalUrls.includes(customUrl)) {
          finalUrls.push(customUrl);
        }
      }
    }
    // Include any remaining in case something wasn't in orderTokens
    for (const u of urls) {
      if (!finalUrls.includes(u)) finalUrls.push(u);
    }
    return { urls: finalUrls, paths };
  }

  return { urls, paths };
}

/**
 * Extracts the storage object path from a Supabase storage public URL.
 * Example:
 * https://<ref>.supabase.co/storage/v1/object/public/product-images/products/photo-1.webp
 * -> "products/photo-1.webp"
 */
export function extractProductImagePath(url: string, bucket = "product-images"): string | null {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index !== -1) {
    const rawPath = url.slice(index + marker.length).split("?")[0].split("#")[0];
    return decodeURIComponent(rawPath).trim();
  }
  return null;
}

/**
 * Safely removes orphaned product images from Supabase Storage upon permanent deletion.
 * Verifies that no remaining products (active, paused, or cloned) are still referencing the images.
 */
export async function cleanupOrphanProductImages(
  db: SupabaseClient,
  candidateUrls: string[],
  deletingProductIds: string[]
): Promise<number> {
  const candidatePaths = [
    ...new Set(
      candidateUrls
        .map(u => extractProductImagePath(u))
        .filter((p): p is string => Boolean(p && p.length > 0))
    ),
  ];

  if (candidatePaths.length === 0) return 0;

  // Query remaining products that are NOT being deleted
  let query = db.from("products").select("image_url, image_urls");
  if (deletingProductIds.length > 0) {
    query = query.not("id", "in", `(${deletingProductIds.join(",")})`);
  }

  const { data: remainingProducts, error } = await query;
  if (error) {
    console.warn("[cleanupOrphanProductImages] Error consultando productos restantes:", error);
    return 0;
  }

  const referencedPaths = new Set<string>();
  if (remainingProducts) {
    for (const prod of remainingProducts) {
      if (prod.image_url) {
        const path = extractProductImagePath(prod.image_url);
        if (path) referencedPaths.add(path);
      }
      if (Array.isArray(prod.image_urls)) {
        for (const u of prod.image_urls) {
          const path = extractProductImagePath(u);
          if (path) referencedPaths.add(path);
        }
      }
    }
  }

  const pathsToRemove = candidatePaths.filter(p => !referencedPaths.has(p));
  if (pathsToRemove.length === 0) return 0;

  try {
    const { error: removeError } = await db.storage.from("product-images").remove(pathsToRemove);
    if (removeError) {
      console.warn("[cleanupOrphanProductImages] Error eliminando fotos de storage:", removeError);
      return 0;
    }
    return pathsToRemove.length;
  } catch (err) {
    console.warn("[cleanupOrphanProductImages] Excepción al remover fotos:", err);
    return 0;
  }
}

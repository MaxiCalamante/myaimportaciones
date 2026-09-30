"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-auth";
import { prepareProductImages } from "@/lib/admin-media";
import { parseCarouselSlides } from "@/lib/carousel";

export async function uploadCarouselImageAction(form: FormData) {
  const db = await getAdminClient();
  const image = form.get("image");
  if (!(image instanceof File) || !image.size) throw new Error("Seleccioná una imagen.");
  const clean = new FormData(); clean.set("image", image);
  const { urls } = await prepareProductImages(db, clean);
  return urls[0];
}
export async function saveCarouselAction(form: FormData) {
  const db = await getAdminClient();
  const raw = form.get("slides");
  if (typeof raw !== "string" || raw.length > 50000) throw new Error("Configuración de carrusel inválida.");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { throw new Error("Configuración de carrusel inválida."); }
  const slides = parseCarouselSlides(input);
  const revision = Number(form.get("revision"));
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Versión del carrusel inválida.");
  const { data, error } = await db.from("storefront_carousel").update({ slides, revision: revision + 1, updated_at: new Date().toISOString() }).eq("id", 1).eq("revision", revision).select("revision").maybeSingle();
  if (error) throw new Error("No se pudo guardar el carrusel. Revisá acceso, conexión y migración.");
  if (!data) throw new Error("El carrusel cambió en otro dispositivo. Recargá la sección antes de volver a guardar.");
  revalidatePath("/");
  revalidatePath("/admin/carrusel");
  return { revision: data.revision as number };
}

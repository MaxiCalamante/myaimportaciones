import { createServerSupabaseClient } from "./supabase/server";
import { hasSupabaseConfig } from "./supabase/env";
import { defaultCarouselSlides, parseCarouselSlides } from "./carousel";

export async function getPublicCarousel() {
  if (!hasSupabaseConfig()) return defaultCarouselSlides;
  const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc("public_carousel_slides");
  // Preserve the existing carousel until its local migration is applied.
  if (error?.code === "PGRST202") return defaultCarouselSlides;
  if (error) return [];
  try { return parseCarouselSlides(data).filter(slide => slide.active); }
  catch { return []; }
}

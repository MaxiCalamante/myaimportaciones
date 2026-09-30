import { httpsUrl, productImageUrl, validId } from "./admin-product";

export interface CarouselSlide {
  id: string; image: string; eyebrow: string; title: string; description: string;
  btnText: string; btnLink: string; active: boolean;
}
export const MAX_CAROUSEL_SLIDES = 10;
export const defaultCarouselSlides: CarouselSlide[] = [
  { id: "10000000-0000-4000-8000-000000000001", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1800&q=80", eyebrow: "Total Tools & Wadfow", title: "Herramientas Industriales y Profesionales", description: "Herramientas para tu casa, taller y trabajo. Encontrá tu modelo y consultá disponibilidad y entrega desde Tandil.", btnText: "Ver Herramientas", btnLink: "/catalogo?category=herramientas-equipamiento", active: true },
  { id: "10000000-0000-4000-8000-000000000002", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1800&q=80", eyebrow: "Tendencia Mundial en Skincare", title: "Tu próximo cuidado de la piel", description: "Sérums virales, cremas reparadoras y protectores de SKIN1004, Medicube, Dr. Althea y Celimax importados directamente para vos.", btnText: "Ver K-Beauty", btnLink: "/catalogo?category=cosmetica-coreana", active: true },
  { id: "10000000-0000-4000-8000-000000000003", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80", eyebrow: "Envíos Seguros a Todo el País", title: "Comprá con atención cercana", description: "Elegí tus productos y revisá disponibilidad, entrega y condiciones antes de confirmar tu pedido.", btnText: "Ver Catálogo Completo", btnLink: "/catalogo", active: true },
];
export function carouselLink(value: string) {
  if (!value) return "";
  if (/[\\\u0000-\u0020]/.test(value)) throw new Error("El enlace del botón contiene caracteres inválidos.");
  if (value.startsWith("/")) {
    let decoded: string;
    try { decoded = decodeURIComponent(value); } catch { throw new Error("Revisá el enlace del botón."); }
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded)) throw new Error("Usá una ruta interna /catalogo o una URL HTTPS.");
    return value;
  }
  return httpsUrl(value, "Botón");
}
export function parseCarouselSlides(input: unknown): CarouselSlide[] {
  if (!Array.isArray(input) || input.length > MAX_CAROUSEL_SLIDES) throw new Error("El carrusel admite hasta 10 diapositivas.");
  const ids = new Set<string>();
  return input.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Diapositiva inválida.");
    const value = row as Record<string, unknown>;
    const text = (key: string, max: number) => {
      if (typeof value[key] !== "string" || (value[key] as string).length > max) throw new Error(`Revisá ${key} de la diapositiva ${index + 1}.`);
      return (value[key] as string).trim();
    };
    const id = validId(text("id", 36));
    if (ids.has(id)) throw new Error("Hay diapositivas duplicadas.");
    ids.add(id);
    if (typeof value.active !== "boolean") throw new Error("Estado de diapositiva inválido.");
    const slide = { id, image: productImageUrl(text("image", 2000)), eyebrow: text("eyebrow", 100), title: text("title", 160), description: text("description", 600), btnText: text("btnText", 60), btnLink: carouselLink(text("btnLink", 2000)), active: value.active };
    if (slide.active && (!slide.image || !slide.title)) throw new Error(`La diapositiva ${index + 1} necesita imagen y título para activarse.`);
    if (Boolean(slide.btnText) !== Boolean(slide.btnLink)) throw new Error(`Completá texto y enlace del botón ${index + 1}, o dejá ambos vacíos.`);
    return slide;
  });
}
export function moveCarouselSlide(slides: CarouselSlide[], id: string, direction: -1 | 1) {
  const from = slides.findIndex(slide => slide.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= slides.length) return slides;
  const next = [...slides];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

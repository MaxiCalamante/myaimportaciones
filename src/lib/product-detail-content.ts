import type { Product } from "./types";

export function productDescriptionParagraphs(description: string) {
  return description.replace(/\\n/g, "\n").split(/\n\s*\n|\n(?=[A-ZÁÉÍÓÚ])/).map(p => p.trim()).filter(Boolean);
}

export function productDetailSummary(product: Pick<Product, "description" | "specifications">) {
  const paragraph = productDescriptionParagraphs(product.description)[0] ?? "";
  const firstSentence = paragraph.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? paragraph;
  const intro = firstSentence.length <= 200 ? firstSentence : firstSentence.slice(0, 200).replace(/\s+\S*$/, "") + "…";
  const priority = ["capacidad máxima", "capacidad", "altura mínima", "altura máxima", "potencia", "volumen", "contenido", "almacenamiento", "pantalla", "memoria ram", "tamaño"];
  const keyOf = (key: string) => key.replaceAll("_", " ").toLowerCase();
  const highlights = Object.entries(product.specifications ?? {}).filter(([key, value]) => value && priority.includes(keyOf(key))).sort(([a],[b]) => priority.indexOf(keyOf(a)) - priority.indexOf(keyOf(b))).slice(0, 3);
  return { intro, highlights };
}

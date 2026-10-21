export interface ColorSwatch {
  bg: string;
  border?: string;
}

export const COLOR_SWATCH_MAP: Record<string, ColorSwatch> = {
  "negro": { bg: "#18181b", border: "#27272a" },
  "black": { bg: "#18181b", border: "#27272a" },
  "blanco estrella": { bg: "#fef9c3", border: "#fde047" },
  "starlight": { bg: "#fef9c3", border: "#fde047" },
  "blanco": { bg: "#f8fafc", border: "#cbd5e1" },
  "white": { bg: "#f8fafc", border: "#cbd5e1" },
  "medianoche": { bg: "#0f172a", border: "#1e293b" },
  "midnight": { bg: "#0f172a", border: "#1e293b" },
  "azul ultramar": { bg: "#1d4ed8", border: "#1e40af" },
  "azul neblina": { bg: "#7dd3fc", border: "#38bdf8" },
  "azul profundo": { bg: "#1e3a8a", border: "#172554" },
  "azul cielo": { bg: "#38bdf8", border: "#0284c7" },
  "azul hielo": { bg: "#bae6fd", border: "#7dd3fc" },
  "azul marino": { bg: "#1e3a5f", border: "#0f233a" },
  "azul": { bg: "#2563eb", border: "#1d4ed8" },
  "blue": { bg: "#2563eb", border: "#1d4ed8" },
  "rosa": { bg: "#f472b6", border: "#ec4899" },
  "pink": { bg: "#f472b6", border: "#ec4899" },
  "verde azulado": { bg: "#0d9488", border: "#0f766e" },
  "verde salvia": { bg: "#84cc16", border: "#65a30d" },
  "verde grisáceo": { bg: "#6b7280", border: "#4b5563" },
  "verde": { bg: "#10b981", border: "#059669" },
  "green": { bg: "#10b981", border: "#059669" },
  "lavanda": { bg: "#c084fc", border: "#a855f7" },
  "violeta": { bg: "#8b5cf6", border: "#7c3aed" },
  "naranja cósmico": { bg: "#f97316", border: "#ea580c" },
  "naranja": { bg: "#f97316", border: "#ea580c" },
  "borgoña": { bg: "#6b1724", border: "#4a0e17" },
  "glaciar": { bg: "#e0f2fe", border: "#bae6fd" },
  "rosa suave": { bg: "#fbcfe8", border: "#f472b6" },
  "cítrico": { bg: "#d9f99d", border: "#bef264" },
  "citrico": { bg: "#d9f99d", border: "#bef264" },
  "amarillo": { bg: "#facc15", border: "#eab308" },
  "yellow": { bg: "#facc15", border: "#eab308" },
  "titanio natural": { bg: "#94a3b8", border: "#64748b" },
  "titanio negro": { bg: "#27272a", border: "#18181b" },
  "titanio azul": { bg: "#1e3a5f", border: "#0f233a" },
  "negro espacial": { bg: "#1c1c1e", border: "#2c2c2e" },
  "space black": { bg: "#1c1c1e", border: "#2c2c2e" },
  "gris espacial": { bg: "#475569", border: "#334155" },
  "space gray": { bg: "#475569", border: "#334155" },
  "gris carbón": { bg: "#374151", border: "#1f2937" },
  "plata": { bg: "#e2e8f0", border: "#cbd5e1" },
  "silver": { bg: "#e2e8f0", border: "#cbd5e1" },
  "grafito": { bg: "#3f3f46", border: "#27272a" },
  "gris": { bg: "#6b7280", border: "#4b5563" },
  "gray": { bg: "#6b7280", border: "#4b5563" },
  "ivory beige": { bg: "#fef3c7", border: "#fde68a" },
  "oro": { bg: "#facc15", border: "#eab308" },
  "gold": { bg: "#facc15", border: "#eab308" },
  "rojo": { bg: "#ef4444", border: "#dc2626" },
  "red": { bg: "#ef4444", border: "#dc2626" },
  "candy": { bg: "#fb7185", border: "#f43f5e" },
  "qahwa": { bg: "#78350f", border: "#451a03" },
  "café": { bg: "#78350f", border: "#451a03" },
  "canela": { bg: "#b45309", border: "#92400e" },
  "rose gold": { bg: "#fecdd3", border: "#fda4af" },
  "oud": { bg: "#292524", border: "#1c1917" },
};

export function getColorSwatch(colorName: string): ColorSwatch | null {
  const norm = colorName.toLowerCase().trim();
  for (const [key, val] of Object.entries(COLOR_SWATCH_MAP)) {
    if (norm.includes(key)) return val;
  }
  return null;
}

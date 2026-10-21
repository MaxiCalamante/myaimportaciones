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
  "titanio natural": { bg: "#94a3b8", border: "#64748b" },
  "titanio negro": { bg: "#27272a", border: "#18181b" },
  "titanio azul": { bg: "#1e3a5f", border: "#0f233a" },
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
};

export function getColorSwatch(colorName: string): ColorSwatch | null {
  const norm = colorName.toLowerCase().trim();
  for (const [key, val] of Object.entries(COLOR_SWATCH_MAP)) {
    if (norm.includes(key)) return val;
  }
  return null;
}

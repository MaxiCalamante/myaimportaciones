export interface AdminCsvProduct {
  title: string;
  categoryName: string;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  description: string;
}

export function parseAdminProductCsv(input: string): AdminCsvProduct[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("Hay comillas sin cerrar en el CSV.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const products: AdminCsvProduct[] = [];
  for (const [index, columns] of rows.entries()) {
    if (columns[0]?.startsWith("#") || /^t[ií]tulo$/i.test(columns[0] ?? "")) continue;
    const [title, categoryName, retail, wholesale, minimum] = columns;
    const oldStockColumn = columns.length >= 7 && /^\d+$/.test(columns[5] ?? "");
    const description = columns.slice(oldStockColumn ? 6 : 5).join(", ");
    const retailPrice = Number(retail);
    const wholesalePrice = wholesale ? Number(wholesale) : Math.round(retailPrice * 0.75);
    const wholesaleMinQuantity = minimum ? Number(minimum) : 1;
    if (!title || !categoryName || !Number.isFinite(retailPrice) || retailPrice <= 0 || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isInteger(wholesaleMinQuantity) || wholesaleMinQuantity < 1) {
      throw new Error(`Fila ${index + 1}: revisá título, categoría y precios.`);
    }
    products.push({ title, categoryName, retailPrice, wholesalePrice, wholesaleMinQuantity, description });
  }
  if (products.length === 0) throw new Error("No hay productos válidos para importar.");
  return products;
}

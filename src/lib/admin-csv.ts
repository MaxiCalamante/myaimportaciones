export interface AdminCsvProduct {
  title: string;
  categoryName: string;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  description: string;
  sku?: string;
  brand?: string;
  model?: string;
  sourceUrl?: string;
  supplierLivePrice?: number;
}

export function parseAdminProductCsv(input: string, validCategories?: ReadonlySet<string>): AdminCsvProduct[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Hay comillas sin cerrar en el CSV.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  const products: AdminCsvProduct[] = [];

  for (const [index, columns] of rows.entries()) {
    if (columns[0]?.startsWith("#") || /^t[ií]tulo$/i.test(columns[0] ?? "")) continue;

    const [title, categoryName, retail, wholesale, minimum] = columns;
    const oldStockColumn = columns.length >= 7 && /^\d+$/.test(columns[5] ?? "");

    const retailPrice = Number(retail);
    const wholesalePrice = wholesale ? Number(wholesale) : Math.round(retailPrice * 0.75);
    const wholesaleMinQuantity = minimum ? Number(minimum) : 1;

    if (
      !title ||
      !categoryName ||
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0 ||
      !Number.isFinite(wholesalePrice) ||
      wholesalePrice < 0 ||
      !Number.isInteger(wholesaleMinQuantity) ||
      wholesaleMinQuantity < 1
    ) {
      throw new Error(`Fila ${index + 1}: revisá título, categoría y precios.`);
    }
    if (validCategories && !validCategories.has(categoryName.toLowerCase().trim())) {
      throw new Error(`Fila ${index + 1}: la categoría "${categoryName}" no existe.`);
    }

    let description = "";
    let sku: string | undefined;
    let brand: string | undefined;
    let model: string | undefined;
    let sourceUrl: string | undefined;
    let supplierLivePrice: number | undefined;

    if (oldStockColumn) {
      description = columns.slice(6).join(", ");
    } else if (columns.length >= 10 && (columns[8]?.startsWith("http") || columns[8] === "")) {
      // Extended format with supplier and SKU details
      sku = columns[5]?.trim() || undefined;
      brand = columns[6]?.trim() || undefined;
      model = columns[7]?.trim() || undefined;
      sourceUrl = columns[8]?.trim() || undefined;
      const suppPrice = Number(columns[9]);
      if (Number.isFinite(suppPrice) && suppPrice > 0) supplierLivePrice = suppPrice;
      description = columns.slice(10).join(", ");
    } else {
      description = columns.slice(5).join(", ");
    }

    products.push({
      title,
      categoryName,
      retailPrice,
      wholesalePrice,
      wholesaleMinQuantity,
      description,
      sku,
      brand,
      model,
      sourceUrl,
      supplierLivePrice,
    });
    if (products.length > 200) throw new Error("Importá hasta 200 productos por archivo.");
  }

  if (products.length === 0) throw new Error("No hay productos válidos para importar.");
  return products;
}

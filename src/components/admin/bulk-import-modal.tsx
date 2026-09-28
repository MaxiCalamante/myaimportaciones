"use client";

import { useState, useTransition, useId } from "react";
import type { Category } from "@/lib/types";
import { parseAdminProductCsv, type AdminCsvProduct } from "@/lib/admin-csv";
import { bulkImportProductsAction } from "@/app/admin/actions";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  FileText,
  Table,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

interface BulkImportModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export function BulkImportModal({
  categories,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportModalProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<AdminCsvProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputId = useId();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? "");
      setCsvText(content);
      parseContent(content);
    };
    reader.onerror = () => {
      setParseError("No se pudo leer el archivo seleccionado.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePasteChange = (text: string) => {
    setCsvText(text);
    setParseError(null);
    if (text.trim()) {
      parseContent(text);
    } else {
      setParsedProducts([]);
    }
  };

  const parseContent = (text: string) => {
    try {
      const validCategories = new Set(categories.flatMap((category) => [category.name.toLowerCase().trim(), category.slug.toLowerCase().trim()]));
      const items = parseAdminProductCsv(text, validCategories);
      setParsedProducts(items);
      setParseError(null);
    } catch (err: unknown) {
      setParsedProducts([]);
      setParseError(err instanceof Error ? err.message : "Error al procesar el CSV.");
    }
  };

  const handleDownloadTemplate = () => {
    const mainCats = categories.filter((c) => !c.parentId);
    const cat1 = mainCats[0]?.name || "Herramientas";
    const cat2 = mainCats[1]?.name || mainCats[0]?.name || "Cosméticos";

    const csvTemplate = `Titulo,Categoría,PrecioMinorista,PrecioMayorista,MinMayorista,SKU,Marca,Modelo,EnlaceProveedor,CostoProveedor,Descripción
"Taladro Percutor 20V Industrial",${cat1},89900,69900,2,TOTAL-TDLI2001,Total Tools,TDLI2001,https://totalherramientasoficial.com.py/item/1,45000,"Taladro inalámbrico con batería de litio y cargador rápido"
"Serum Facial Hidratante 50ml",${cat2},34900,26500,3,SKIN-CENT-50,Skin1004,Centella,https://atacadousa.com.py/item/2,18000,"Tratamiento intensivo con extracto puro de centella asiática"`;

    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla-productos-mya.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedProducts.length === 0) return;

    startTransition(async () => {
      try {
        const res = await bulkImportProductsAction(parsedProducts);
        onSuccess(res.importedCount);
        onClose();
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : "Error al importar productos.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl min-h-0 flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-950">Importación Masiva de Productos</h3>
              <p className="text-xs text-zinc-500">Cargá tu catálogo completo en formato CSV.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition cursor-pointer"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 flex flex-col flex-1 overflow-hidden">
          <div className="min-h-0 p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-1">
            {/* Top Bar with Template & Mode switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
              <div className="inline-flex rounded-xl bg-zinc-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    mode === "file" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Subir Archivo .CSV
                </button>
                <button
                  type="button"
                  onClick={() => setMode("paste")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    mode === "paste" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Pegar Texto CSV
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-sky-600" />
                Descargar Plantilla CSV Oficial
              </button>
            </div>

            {/* Input area */}
            {mode === "file" ? (
              <div>
                <label
                  htmlFor={fileInputId}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center hover:bg-zinc-100/50 hover:border-sky-500 transition-colors cursor-pointer"
                >
                  <UploadCloud className="h-10 w-10 text-sky-600 mb-2" />
                  <p className="text-sm font-bold text-zinc-800">
                    {fileName ? fileName : "Arrastrá tu archivo .CSV o hacé click para seleccionarlo"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">Formato admitido: CSV o TXT delimitado por comas</p>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-700">
                  <span>Pegar filas CSV:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const mainCats = categories.filter((c) => !c.parentId);
                      const cat1 = mainCats[0]?.name || "Herramientas";
                      const sample = `Titulo,Categoría,PrecioMinorista,PrecioMayorista,MinMayorista,SKU,Marca,Modelo,EnlaceProveedor,CostoProveedor,Descripción\n"Taladro Percutor 20V",${cat1},89900,69900,2,TOTAL-001,Total Tools,TDLI2001,https://totalherramientasoficial.com.py/home,45000,"Taladro profesional con maletín"`;
                      handlePasteChange(sample);
                    }}
                    className="text-sky-600 hover:underline cursor-pointer"
                  >
                    Insertar ejemplo
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  placeholder="Titulo, Categoría, PrecioMinorista, PrecioMayorista, MinMayorista, SKU, Marca, Modelo, EnlaceProveedor, CostoProveedor, Descripción..."
                  className="w-full rounded-xl border border-zinc-300 p-3 font-mono text-xs focus:border-sky-600 focus:bg-white bg-zinc-50 focus:outline-hidden"
                />
              </div>
            )}

            {/* Error Banner */}
            {parseError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Live Preview Table */}
            {parsedProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="h-3.5 w-3.5 text-emerald-600" />
                    Vista Previa ({parsedProducts.length} productos listos para importar)
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    ✓ Todos los datos validados
                  </span>
                </div>

                <div className="overflow-auto rounded-xl border border-zinc-200 max-h-56 scrollbar-thin">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-600 font-bold sticky top-0 border-b border-zinc-200">
                      <tr>
                        <th className="p-2.5">Título</th>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5">PVP</th>
                        <th className="p-2.5">Mayorista</th>
                        <th className="p-2.5">SKU / Marca</th>
                        <th className="p-2.5">Enlace Proveedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {parsedProducts.slice(0, 15).map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="p-2.5 font-semibold text-zinc-900 line-clamp-1 max-w-[200px]">
                            {p.title}
                          </td>
                          <td className="p-2.5 text-zinc-600">{p.categoryName}</td>
                          <td className="p-2.5 font-bold text-zinc-900">${p.retailPrice.toLocaleString("es-AR")}</td>
                          <td className="p-2.5 text-zinc-600">
                            ${p.wholesalePrice.toLocaleString("es-AR")} ({p.wholesaleMinQuantity}+)
                          </td>
                          <td className="p-2.5 text-zinc-500 font-mono text-[11px]">
                            {p.sku || p.brand || "—"}
                          </td>
                          <td className="p-2.5 text-zinc-500 max-w-[150px] truncate">
                            {p.sourceUrl ? (
                              <span className="text-sky-600 font-semibold truncate block">
                                {p.sourceUrl}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">Sin enlace</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedProducts.length > 15 && (
                  <p className="text-[11px] text-zinc-500 text-right">
                    ... y {parsedProducts.length - 15} productos más incluidos en la importación.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 shrink-0">
            <span className="text-xs text-zinc-500 text-center sm:text-left">
              {parsedProducts.length > 0 ? `${parsedProducts.length} productos detectados` : "Esperando archivo..."}
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || parsedProducts.length === 0}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 text-center"
              >
                {isPending ? (
                  "Importando productos…"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Importar {parsedProducts.length} Productos
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

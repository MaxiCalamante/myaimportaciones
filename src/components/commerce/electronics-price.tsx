import { electronicsDollarPrice, formatDollarPrice } from "@/lib/electronics-price";
import type { Product } from "@/lib/types";

export function ElectronicsPrice({ product, detail = false }: { product: Product; detail?: boolean }) {
  const usd = electronicsDollarPrice(product);
  if (usd === null) return null;
  return <div className="mt-1 text-sky-800">
    <p className={detail ? "text-lg font-bold tabular-nums" : "text-sm font-semibold tabular-nums"}>{formatDollarPrice(usd)}</p>
    {detail && <p className="mt-1 text-xs leading-5 text-zinc-600">Equivalente del precio en pesos. Cotización: $ {Number(product.specifications?.["Cotización USD/ARS"]).toLocaleString("es-AR")} por USD{product.specifications?.["Fecha de cotización"] ? ` · ${product.specifications["Fecha de cotización"]}` : ""}. El pago online se realiza en pesos.</p>}
  </div>;
}

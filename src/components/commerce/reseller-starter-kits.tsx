"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Boxes,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  ShoppingCart,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { getWhatsAppUrl } from "@/lib/site";
import type { Product } from "@/lib/types";

interface ResellerStarterKitsProps {
  products: Product[];
}

export function ResellerStarterKits({ products }: ResellerStarterKitsProps) {
  const { addToCart, setCartOpen } = useCommerce();
  const [addedKitId, setAddedKitId] = useState<string | null>(null);

  // Helper to find best matching product in catalog
  const findProduct = (query: string): Product | undefined => {
    const q = query.toLowerCase();
    return (
      products.find((p) => p.title.toLowerCase().includes(q)) ||
      products.find((p) => p.categoryName.toLowerCase().includes(q))
    );
  };

  const kits = useMemo(() => {
    return [
      {
        id: "kbeauty_starter",
        title: "Pack Emprendedora K-Beauty (Top Ventas)",
        tagline: "Los 5 productos más virales de TikTok para reventa inmediata en showrooms y estéticas",
        badge: "Más Vendido",
        category: "Cosmética Coreana",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
        wholesalePrice: 125000,
        suggestedRetailRevenue: 245000,
        netProfit: 120000,
        roiPercent: 49,
        itemsCount: 10,
        items: [
          { name: "SKIN1004 Centella Ampoule 100ml", qty: 2, query: "centella ampoule" },
          { name: "SKIN1004 Hyalu-Cica Water-Fit Sun Serum", qty: 2, query: "hyalu-cica" },
          { name: "Medicube Zero Pore Pad 2.0 (70 pads)", qty: 2, query: "medicube" },
          { name: "Dr. Althea 345 Relief Cream 50ml", qty: 2, query: "dr althea" },
          { name: "Karseell Colágeno Maca Essence 500ml", qty: 2, query: "karseell" },
        ],
        perks: [
          "Margen limpio garantizado del 49%",
          "Folletería digital y fotos HD para tus redes",
          "Rotación comprobada en menos de 15 días",
        ],
      },
      {
        id: "total_tools_starter",
        title: "Pack Ferretería Total Tools Taller Pro",
        tagline: "El combo indispensable para ferreterías de barrio, talleres mecánicos y corralones",
        badge: "Alta Demanda",
        category: "Herramientas",
        image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=800&auto=format&fit=crop",
        wholesalePrice: 185000,
        suggestedRetailRevenue: 340000,
        netProfit: 155000,
        roiPercent: 46,
        itemsCount: 4,
        items: [
          { name: "Amoladora Angular 850W Total Tools", qty: 1, query: "amoladora" },
          { name: "Taladro Percutor 20V Inalámbrico Total Tools", qty: 1, query: "taladro" },
          { name: "Caja de Herramientas / Valija Reforzada", qty: 1, query: "caja" },
          { name: "Set Destornilladores y Puntas de Impacto Wadfow", qty: 1, query: "destornillador" },
        ],
        perks: [
          "Ahorro de un 28% vs Mercado Libre",
          "Garantía oficial Total Tools con repuestos",
          "Herramientas indispensables de uso diario",
        ],
      },
      {
        id: "karseell_salon_pack",
        title: "Pack Salón & Estilistas Karseell Colágeno x6",
        tagline: "Caja cerrada de la mascarilla capilar más pedida en peluquerías de todo el país",
        badge: "Rápido Retorno",
        category: "Cuidado Capilar",
        image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop",
        wholesalePrice: 110000,
        suggestedRetailRevenue: 216000,
        netProfit: 106000,
        roiPercent: 49,
        itemsCount: 6,
        items: [
          { name: "Mascarilla Karseell Colágeno Maca 500ml", qty: 6, query: "karseell" },
        ],
        perks: [
          "Supera el mínimo mayorista ($100.000) en 1 solo producto",
          "Rinde hasta 25 aplicaciones de salón por pote",
          "Recompra mensual de clientes asegurada",
        ],
      },
    ];
  }, []);

  const handleAddKitToCart = (kit: (typeof kits)[0]) => {
    // Add matched products to cart in wholesale channel
    kit.items.forEach((item) => {
      const matched = findProduct(item.query) || products[0];
      if (matched) {
        addToCart(matched, "wholesale", item.qty);
      }
    });

    setAddedKitId(kit.id);
    setCartOpen(true);
    setTimeout(() => setAddedKitId(null), 3000);
  };

  return (
    <section className="py-12 sm:py-16 bg-zinc-50 border-t border-zinc-200" id="kits-revendedores">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800">
              <Boxes className="h-3.5 w-3.5 text-amber-600" />
              Packs de Emprendimiento Mayorista
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-950">
              Kits de Inicio Listos para Revender con Rentabilidad Garantizada
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
              Selecciones cerradas con los productos de mayor rotación y margen limpio.
              Comprás a precio de importador directo y duplicás tu inversión revendiendo en tu ciudad.
            </p>
          </div>

          <div className="shrink-0">
            <span className="text-xs font-semibold text-zinc-500 block">
              Mínimo de compra B2B: <strong>$100.000</strong>
            </span>
          </div>
        </div>

        {/* Kits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {kits.map((kit) => {
            const isAdded = addedKitId === kit.id;
            const whatsappText = `Hola MYA Importaciones! Quisiera reservar el "${kit.title}" por ${formatCurrency(kit.wholesalePrice)} para revender.`;

            return (
              <div
                key={kit.id}
                className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
              >
                <div>
                  {/* Image header with badges */}
                  <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
                    <Image
                      src={kit.image}
                      alt={kit.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-zinc-950 px-2.5 py-1 rounded-full shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        {kit.badge}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[11px] font-medium text-amber-300 block">{kit.category}</span>
                      <h3 className="text-base font-bold leading-snug">{kit.title}</h3>
                    </div>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-zinc-600 leading-relaxed">{kit.tagline}</p>

                    <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-3 shadow-inner">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-zinc-400">Tu Inversión Mayorista:</span>
                        <span className="text-2xl font-black text-white">{formatCurrency(kit.wholesalePrice)}</span>
                      </div>

                      <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Facturación al PVP Sugerido:</span>
                        <span className="font-bold text-zinc-200">{formatCurrency(kit.suggestedRetailRevenue)}</span>
                      </div>

                      <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">Tu Ganancia Neta:</span>
                        <span className="text-base font-black text-emerald-400">
                          +{formatCurrency(kit.netProfit)} ({kit.roiPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Pack Items List */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Contenido del Pack ({kit.itemsCount} unidades):
                      </span>
                      <ul className="space-y-1 text-xs text-zinc-700">
                        {kit.items.map((it, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="font-black text-emerald-600 shrink-0">{it.qty}x</span>
                            <span className="truncate">{it.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Perks */}
                    <div className="pt-2 border-t border-zinc-100 space-y-1">
                      {kit.perks.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-5 pt-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleAddKitToCart(kit)}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer ${
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        ¡Kit Agregado al Carrito!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Agregar Kit al Carrito Mayorista
                      </>
                    )}
                  </button>

                  <a
                    href={getWhatsAppUrl(whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 py-2.5 text-xs font-bold text-emerald-800 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Consultar Kit por WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

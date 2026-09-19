"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Share2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Radio,
  Play,
  Layers,
  ShoppingBag,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  getMarketingConfig,
  saveMarketingConfig,
  trackAdsEvent,
  type MarketingConfig,
} from "@/lib/analytics";
import { siteConfig } from "@/lib/site";

export function MarketingHub() {
  const [config, setConfig] = useState<MarketingConfig>(getMarketingConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedMetaFeed, setCopiedMetaFeed] = useState(false);
  const [copiedGoogleFeed, setCopiedGoogleFeed] = useState(false);
  const [testEventFeedback, setTestEventFeedback] = useState<string | null>(null);

  useEffect(() => {
    setConfig(getMarketingConfig());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMarketingConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : siteConfig.appUrl;
  const metaFeedUrl = `${baseUrl}/api/catalog/meta-feed`;
  const googleFeedUrl = `${baseUrl}/api/catalog/google-feed`;

  const copyToClipboard = async (text: string, type: "meta" | "google") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "meta") {
        setCopiedMetaFeed(true);
        setTimeout(() => setCopiedMetaFeed(false), 3000);
      } else {
        setCopiedGoogleFeed(true);
        setTimeout(() => setCopiedGoogleFeed(false), 3000);
      }
    } catch {}
  };

  const handleTestEvent = (eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase") => {
    trackAdsEvent(eventName, {
      content_name: "Producto de Prueba MYA",
      content_ids: ["test-prod-123"],
      value: 150000,
      currency: "ARS",
      quantity: 1,
      transaction_id: `TEST-${Date.now().toString().slice(-6)}`,
      items: [{ id: "test-prod-123", title: "Producto de Prueba MYA", price: 150000, quantity: 1 }],
    });

    setTestEventFeedback(`¡Evento "${eventName}" disparado a los píxeles activos! Revisá la consola (F12) para ver los detalles.`);
    setTimeout(() => setTestEventFeedback(null), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 via-indigo-950 to-zinc-950 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-200">
            <Megaphone className="h-3.5 w-3.5" />
            Marketing & Ads Ecosystem
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-white">
            Centro de Conexión de Publicidad, Píxeles & Catálogos
          </h2>
          <p className="mt-2 text-sm text-zinc-300 max-w-3xl leading-relaxed">
            Dejá tu tienda 100% conectada con <strong>Meta Ads (Facebook e Instagram)</strong>, <strong>Google Ads & GA4</strong> y <strong>TikTok Ads</strong>.
            Solo pegá los IDs de tus píxeles abajo para empezar a medir conversiones (Visualizaciones, Carritos y Compras) y sincronizá tus productos con los Feeds XML automáticos.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ¡Configuración de marketing guardada exitosamente! Los píxeles configurados ya están activos en toda la tienda.
        </div>
      )}

      {testEventFeedback && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
          {testEventFeedback}
        </div>
      )}

      {/* Grid: Pixel Configuration (Left) & Feeds / Testing (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Pixel IDs Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Radio className="h-5 w-5 text-blue-600" />
                Píxeles y Cuentas de Anuncios
              </h3>
              <span className="text-xs text-zinc-500 font-medium">Guarda al instante</span>
            </div>

            {/* Meta Pixel */}
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Meta Pixel ID (Facebook / Instagram Ads)
                </label>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    config.metaPixelId ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {config.metaPixelId ? "Activo" : "No configurado"}
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej. 123456789012345"
                value={config.metaPixelId}
                onChange={(e) => setConfig({ ...config, metaPixelId: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Ubicación en Meta: Administrador de Eventos ➔ Administrador de Anuncios ➔ Configuración de Orígenes de Datos.
              </p>
            </div>

            {/* Google Ads */}
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Google Ads Conversion ID (Tag)
                </label>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    config.googleAdsId ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {config.googleAdsId ? "Activo" : "No configurado"}
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej. AW-123456789"
                value={config.googleAdsId}
                onChange={(e) => setConfig({ ...config, googleAdsId: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Ubicación en Google Ads: Herramientas ➔ Medición ➔ Conversiones ➔ Google Tag (AW-XXXXXXXX).
              </p>
            </div>

            {/* Google Analytics 4 */}
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
                  Google Analytics 4 (GA4 ID de Medición)
                </label>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    config.ga4Id ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {config.ga4Id ? "Activo" : "No configurado"}
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej. G-ABC123XYZ"
                value={config.ga4Id}
                onChange={(e) => setConfig({ ...config, ga4Id: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Ubicación en GA4: Administrar ➔ Flujos de datos ➔ ID de medición (G-XXXXXXXXXX).
              </p>
            </div>

            {/* TikTok Pixel */}
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-600 inline-block" />
                  TikTok Pixel ID
                </label>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    config.tiktokPixelId ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {config.tiktokPixelId ? "Activo" : "No configurado"}
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej. C1234567890123456789"
                value={config.tiktokPixelId}
                onChange={(e) => setConfig({ ...config, tiktokPixelId: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Ubicación en TikTok Ads Manager: Assets ➔ Events ➔ Web Events ➔ Pixel ID.
              </p>
            </div>

            {/* Google Tag Manager */}
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Google Tag Manager (GTM ID - Opcional)
                </label>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    config.gtmId ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {config.gtmId ? "Activo" : "No configurado"}
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej. GTM-XXXXXXX"
                value={config.gtmId}
                onChange={(e) => setConfig({ ...config, gtmId: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.testMode}
                  onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Modo Pruebas / Consola (muestra logs de eventos en F12)
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Catalog Feeds & Live Testing */}
        <div className="lg:col-span-5 space-y-6">
          {/* Product Feeds */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Feeds de Catálogo XML para Anuncios
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Conectá tu catálogo con Meta Commerce y Google Shopping. Los feeds se actualizan en tiempo real con stock, precios mayoristas/minoristas e imágenes en alta calidad.
            </p>

            {/* Meta Catalog Feed */}
            <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900">
                  Meta Catalog Feed (Facebook / IG Shopping)
                </span>
                <a
                  href={metaFeedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver XML <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={metaFeedUrl}
                  className="w-full text-xs font-mono bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-600 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(metaFeedUrl, "meta")}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copiedMetaFeed ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedMetaFeed ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Pega este enlace en: Meta Commerce Manager ➔ Catálogo ➔ Orígenes de datos ➔ Subida de datos programada (frecuencia diaria).
              </p>
            </div>

            {/* Google Merchant Center Feed */}
            <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900">
                  Google Merchant Center Feed (Google Shopping)
                </span>
                <a
                  href={googleFeedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-700 hover:underline flex items-center gap-1"
                >
                  Ver XML <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={googleFeedUrl}
                  className="w-full text-xs font-mono bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-600 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(googleFeedUrl, "google")}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {copiedGoogleFeed ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedGoogleFeed ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Pega este enlace en: Google Merchant Center ➔ Productos ➔ Feeds ➔ Añadir feed principal ➔ Obtención de URL programada.
              </p>
            </div>
          </div>

          {/* Live Events Tester */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-600" />
              Probador en Vivo de Conversiones
            </h3>
            <p className="text-xs text-zinc-600">
              Probá que tus píxeles instalados reciban los eventos simulando una acción de usuario:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestEvent("ViewContent")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-blue-400 bg-zinc-50 hover:bg-blue-50 text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-zinc-900 block">Probar ViewContent</span>
                <span className="text-[10px] text-zinc-500">Ver ficha de producto</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent("AddToCart")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-emerald-400 bg-zinc-50 hover:bg-emerald-50 text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-zinc-900 block">Probar AddToCart</span>
                <span className="text-[10px] text-zinc-500">Agregar al carrito</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent("InitiateCheckout")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-amber-400 bg-zinc-50 hover:bg-amber-50 text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-zinc-900 block">Probar Checkout</span>
                <span className="text-[10px] text-zinc-500">Iniciar proceso de pago</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestEvent("Purchase")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-purple-400 bg-zinc-50 hover:bg-purple-50 text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-zinc-900 block">Probar Purchase</span>
                <span className="text-[10px] text-zinc-500">Conversión de compra</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Reference Guide Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          Mapeo Automático de Eventos en MYA Importaciones
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 font-bold">Momento / Acción del Cliente</th>
                <th className="py-2.5 font-bold">Meta Pixel (FB/IG)</th>
                <th className="py-2.5 font-bold">Google Ads / GA4</th>
                <th className="py-2.5 font-bold">TikTok Pixel</th>
                <th className="py-2.5 font-bold">Parámetros Enviados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              <tr className="hover:bg-zinc-50">
                <td className="py-2.5 font-bold text-zinc-900">Navegación / Entrada a página</td>
                <td className="py-2.5 font-mono text-blue-600">PageView</td>
                <td className="py-2.5 font-mono text-orange-600">page_view</td>
                <td className="py-2.5 font-mono text-pink-600">Page</td>
                <td className="py-2.5 text-zinc-500">Ruta URL, query params</td>
              </tr>
              <tr className="hover:bg-zinc-50">
                <td className="py-2.5 font-bold text-zinc-900">Ver Ficha de Producto o Modal</td>
                <td className="py-2.5 font-mono text-blue-600">ViewContent</td>
                <td className="py-2.5 font-mono text-orange-600">view_item</td>
                <td className="py-2.5 font-mono text-pink-600">ViewContent</td>
                <td className="py-2.5 text-zinc-500">ID, Nombre, Precio, ARS</td>
              </tr>
              <tr className="hover:bg-zinc-50">
                <td className="py-2.5 font-bold text-zinc-900">Agregar al Carrito de Compras</td>
                <td className="py-2.5 font-mono text-blue-600">AddToCart</td>
                <td className="py-2.5 font-mono text-orange-600">add_to_cart</td>
                <td className="py-2.5 font-mono text-pink-600">AddToCart</td>
                <td className="py-2.5 text-zinc-500">ID, Cantidad, Precio total, ARS</td>
              </tr>
              <tr className="hover:bg-zinc-50">
                <td className="py-2.5 font-bold text-zinc-900">Abrir Pantalla de Checkout</td>
                <td className="py-2.5 font-mono text-blue-600">InitiateCheckout</td>
                <td className="py-2.5 font-mono text-orange-600">begin_checkout</td>
                <td className="py-2.5 font-mono text-pink-600">InitiateCheckout</td>
                <td className="py-2.5 text-zinc-500">Valor de orden, N° productos</td>
              </tr>
              <tr className="hover:bg-zinc-50">
                <td className="py-2.5 font-bold text-zinc-900">Confirmación de Pedido / Compra</td>
                <td className="py-2.5 font-mono text-blue-600">Purchase</td>
                <td className="py-2.5 font-mono text-orange-600">purchase + conversion</td>
                <td className="py-2.5 font-mono text-pink-600">CompletePayment</td>
                <td className="py-2.5 text-zinc-500">Código de orden, Monto total ARS, Ítems</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

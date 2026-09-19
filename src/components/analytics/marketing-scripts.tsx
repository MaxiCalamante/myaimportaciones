"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getMarketingConfig,
  type MarketingConfig,
  type AdsEventType,
  type AdsEventPayload,
} from "@/lib/analytics";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, params?: any) => void;
      [key: string]: any;
    };
  }
}

export function MarketingScripts() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<MarketingConfig | null>(null);
  const initializedPixelsRef = useRef<{
    meta?: string;
    google?: string;
    tiktok?: string;
    gtm?: string;
  }>({});

  // 1. Load configuration from localStorage or defaults
  useEffect(() => {
    const loaded = getMarketingConfig();
    setConfig(loaded);

    function handleConfigUpdate(e: Event) {
      const customEvent = e as CustomEvent<MarketingConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getMarketingConfig());
      }
    }

    window.addEventListener("mya_marketing_config_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("mya_marketing_config_updated", handleConfigUpdate);
    };
  }, []);

  // 2. Initialize tracking scripts when config changes
  useEffect(() => {
    if (!config || !config.enabled) return;

    // --- META PIXEL ---
    if (config.metaPixelId && initializedPixelsRef.current.meta !== config.metaPixelId) {
      if (!window.fbq) {
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = true;
          n.version = "2.0";
          n.queue = [];
          t = b.createElement(e);
          t.async = true;
          t.id = "mya-meta-pixel-script";
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      }

      if (window.fbq) {
        window.fbq("init", config.metaPixelId.trim());
        window.fbq("track", "PageView");
        initializedPixelsRef.current.meta = config.metaPixelId;
        if (config.testMode) {
          console.log(`[MYA Ads Hub] Meta Pixel inicializado: ${config.metaPixelId}`);
        }
      }
    }

    // --- GOOGLE ADS & GA4 (gtag.js) ---
    const primaryGoogleId = config.ga4Id?.trim() || config.googleAdsId?.trim();
    if (primaryGoogleId && initializedPixelsRef.current.google !== primaryGoogleId) {
      if (!document.getElementById("mya-google-gtag-script")) {
        const script = document.createElement("script");
        script.id = "mya-google-gtag-script";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${primaryGoogleId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
          window.dataLayer?.push(arguments);
        };
        window.gtag("js", new Date());
      }

      if (window.gtag) {
        if (config.ga4Id?.trim()) {
          window.gtag("config", config.ga4Id.trim(), {
            send_page_view: true,
          });
        }
        if (config.googleAdsId?.trim()) {
          window.gtag("config", config.googleAdsId.trim());
        }
        initializedPixelsRef.current.google = primaryGoogleId;
        if (config.testMode) {
          console.log(`[MYA Ads Hub] Google Tag inicializado (GA4: ${config.ga4Id || "N/A"}, Google Ads: ${config.googleAdsId || "N/A"})`);
        }
      }
    }

    // --- GOOGLE TAG MANAGER (GTM) ---
    if (config.gtmId && initializedPixelsRef.current.gtm !== config.gtmId) {
      const gtmId = config.gtmId.trim();
      if (!document.getElementById("mya-gtm-script")) {
        const script = document.createElement("script");
        script.id = "mya-gtm-script";
        script.async = true;
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
        document.head.appendChild(script);
        initializedPixelsRef.current.gtm = gtmId;
        if (config.testMode) {
          console.log(`[MYA Ads Hub] GTM inicializado: ${gtmId}`);
        }
      }
    }

    // --- TIKTOK PIXEL ---
    if (config.tiktokPixelId && initializedPixelsRef.current.tiktok !== config.tiktokPixelId) {
      const ttId = config.tiktokPixelId.trim();
      if (!window.ttq) {
        (function (w: any, d: any, t: any) {
          w.TiktokAnalyticsObject = t;
          var ttq = (w[t] = w[t] || []);
          ttq.methods = [
            "page",
            "track",
            "identify",
            "instances",
            "debug",
            "on",
            "off",
            "once",
            "ready",
            "alias",
            "group",
            "enableCookie",
            "disableCookie",
            "holdConsent",
            "revokeConsent",
            "grantConsent",
          ];
          ttq.setAndDefer = function (t: any, e: any) {
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
          ttq.instance = function (t: any) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
              ttq.setAndDefer(e, ttq.methods[n]);
            return e;
          };
          ttq.load = function (e: any, n: any) {
            var r = "https://analytics.tiktok.com/i18n/pixel/events.js",
              o = n && n.partner;
            ttq._i = ttq._i || {};
            ttq._i[e] = [];
            ttq._i[e]._u = r;
            ttq._t = ttq._t || {};
            ttq._t[e] = +new Date();
            ttq._o = ttq._o || {};
            ttq._o[e] = n || {};
            var a = document.createElement("script");
            a.id = "mya-tiktok-script";
            a.type = "text/javascript";
            a.async = true;
            a.src = r + "?sdkid=" + e + "&lib=" + t;
            var c = document.getElementsByTagName("script")[0];
            c.parentNode?.insertBefore(a, c);
          };
        })(window, document, "ttq");
      }

      if (window.ttq) {
        window.ttq.load(ttId);
        window.ttq.page();
        initializedPixelsRef.current.tiktok = ttId;
        if (config.testMode) {
          console.log(`[MYA Ads Hub] TikTok Pixel inicializado: ${ttId}`);
        }
      }
    }
  }, [config]);

  // 3. Track PageView on route navigation
  useEffect(() => {
    if (!config || !config.enabled) return;

    if (window.fbq && config.metaPixelId) {
      window.fbq("track", "PageView");
    }
    if (window.gtag && (config.ga4Id || config.googleAdsId)) {
      window.gtag("event", "page_view", {
        page_path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""),
      });
    }
    if (window.ttq && config.tiktokPixelId) {
      window.ttq.page();
    }
  }, [pathname, searchParams, config]);

  // 4. Listen for custom ads events dispatched across the store
  useEffect(() => {
    function handleAdsEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        eventType: AdsEventType;
        payload: AdsEventPayload;
        timestamp: string;
      }>;
      const { eventType, payload } = customEvent.detail;

      if (!config || !config.enabled) {
        if (config?.testMode) {
          console.log(`[MYA Ads Hub (Desactivado)] Evento omitido: ${eventType}`, payload);
        }
        return;
      }

      if (config.testMode) {
        console.log(`[MYA Ads Hub 🎯 Evento Disparado: ${eventType}]`, payload);
      }

      // --- META PIXEL EVENTS ---
      if (window.fbq && config.metaPixelId) {
        try {
          switch (eventType) {
            case "ViewContent":
              window.fbq("track", "ViewContent", {
                content_name: payload.content_name,
                content_ids: payload.content_ids,
                content_type: payload.content_type || "product",
                value: payload.value,
                currency: payload.currency || "ARS",
              });
              break;
            case "AddToCart":
              window.fbq("track", "AddToCart", {
                content_name: payload.content_name,
                content_ids: payload.content_ids,
                content_type: payload.content_type || "product",
                value: payload.value,
                currency: payload.currency || "ARS",
              });
              break;
            case "InitiateCheckout":
              window.fbq("track", "InitiateCheckout", {
                value: payload.value,
                currency: payload.currency || "ARS",
                num_items: payload.num_items,
              });
              break;
            case "Purchase":
              window.fbq("track", "Purchase", {
                value: payload.value,
                currency: payload.currency || "ARS",
                content_type: "product",
                contents: payload.items?.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                  item_price: item.price,
                })),
              });
              break;
            case "Search":
              window.fbq("track", "Search", {
                search_string: payload.search_string,
              });
              break;
            case "Contact":
              window.fbq("track", "Contact");
              break;
            default:
              window.fbq("trackCustom", eventType, payload);
          }
        } catch (err) {
          console.warn("[MYA Ads Hub] Error al despachar evento Meta:", err);
        }
      }

      // --- GOOGLE ADS / GA4 EVENTS ---
      if (window.gtag && (config.ga4Id || config.googleAdsId)) {
        try {
          switch (eventType) {
            case "ViewContent":
              window.gtag("event", "view_item", {
                currency: payload.currency || "ARS",
                value: payload.value,
                items: [
                  {
                    item_id: payload.content_ids?.[0],
                    item_name: payload.content_name,
                    price: payload.value,
                  },
                ],
              });
              break;
            case "AddToCart":
              window.gtag("event", "add_to_cart", {
                currency: payload.currency || "ARS",
                value: payload.value,
                items: [
                  {
                    item_id: payload.content_ids?.[0],
                    item_name: payload.content_name,
                    price: payload.value,
                    quantity: payload.quantity || 1,
                  },
                ],
              });
              break;
            case "InitiateCheckout":
              window.gtag("event", "begin_checkout", {
                currency: payload.currency || "ARS",
                value: payload.value,
                items: payload.items?.map((it) => ({
                  item_id: it.id,
                  item_name: it.title,
                  price: it.price,
                  quantity: it.quantity,
                })),
              });
              break;
            case "Purchase":
              window.gtag("event", "purchase", {
                transaction_id: payload.transaction_id,
                value: payload.value,
                currency: payload.currency || "ARS",
                items: payload.items?.map((it) => ({
                  item_id: it.id,
                  item_name: it.title,
                  price: it.price,
                  quantity: it.quantity,
                })),
              });
              // Also track Google Ads conversion if configured
              if (config.googleAdsId) {
                window.gtag("event", "conversion", {
                  send_to: config.googleAdsId,
                  value: payload.value,
                  currency: payload.currency || "ARS",
                  transaction_id: payload.transaction_id,
                });
              }
              break;
            case "Search":
              window.gtag("event", "search", {
                search_term: payload.search_string,
              });
              break;
            default:
              window.gtag("event", eventType.toLowerCase(), payload);
          }
        } catch (err) {
          console.warn("[MYA Ads Hub] Error al despachar evento Google:", err);
        }
      }

      // --- TIKTOK PIXEL EVENTS ---
      if (window.ttq && config.tiktokPixelId) {
        try {
          switch (eventType) {
            case "ViewContent":
              window.ttq.track("ViewContent", {
                content_id: payload.content_ids?.[0],
                content_name: payload.content_name,
                content_type: "product",
                value: payload.value,
                currency: payload.currency || "ARS",
              });
              break;
            case "AddToCart":
              window.ttq.track("AddToCart", {
                content_id: payload.content_ids?.[0],
                content_name: payload.content_name,
                content_type: "product",
                value: payload.value,
                currency: payload.currency || "ARS",
                quantity: payload.quantity || 1,
              });
              break;
            case "InitiateCheckout":
              window.ttq.track("InitiateCheckout", {
                value: payload.value,
                currency: payload.currency || "ARS",
              });
              break;
            case "Purchase":
              window.ttq.track("CompletePayment", {
                content_id: payload.transaction_id,
                value: payload.value,
                currency: payload.currency || "ARS",
              });
              break;
            case "Contact":
              window.ttq.track("Contact");
              break;
            default:
              window.ttq.track(eventType, payload);
          }
        } catch (err) {
          console.warn("[MYA Ads Hub] Error al despachar evento TikTok:", err);
        }
      }
    }

    window.addEventListener("mya_ads_event", handleAdsEvent);
    return () => {
      window.removeEventListener("mya_ads_event", handleAdsEvent);
    };
  }, [config]);

  return null;
}

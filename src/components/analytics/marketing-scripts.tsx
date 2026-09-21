"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getMarketingConfig, type AdsEventType, type AdsEventPayload } from "@/lib/analytics";
type Tracker = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: Tracker; loaded?: boolean; version?: string };
type TikQueue = unknown[][] & { page: () => void; track: (event: string, params?: unknown) => void; grantConsent: () => void; revokeConsent: () => void; _i: Record<string, unknown[][] & { _u?: string }>; _t: Record<string, number>; _o: Record<string, object> };
declare global { interface Window { fbq?: Tracker; _fbq?: Tracker; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; ttq?: TikQueue; TiktokAnalyticsObject?: string; } }
function subscribe(fn: () => void) { window.addEventListener("mya_consent", fn); window.addEventListener("mya_marketing_config_updated", fn); return () => { window.removeEventListener("mya_consent", fn); window.removeEventListener("mya_marketing_config_updated", fn); }; }
function snapshot() { try { return JSON.stringify({ ...getMarketingConfig(), consent: localStorage.getItem("mya_analytics_consent") === "granted" }); } catch { return ""; } }
function load(id: string, src: string) { if (document.getElementById(id)) return; const script = document.createElement("script"); script.id = id; script.async = true; script.src = src; document.head.appendChild(script); }
const eventNames: Record<AdsEventType, string> = { PageView: "page_view", ViewContent: "view_item", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout", Purchase: "purchase", Search: "search", Contact: "contact" };
export function MarketingScripts() {
 const pathname = usePathname();
 const serialized = useSyncExternalStore(subscribe, snapshot, () => "");
 const config = useMemo(() => serialized ? JSON.parse(serialized) as ReturnType<typeof getMarketingConfig> & { consent: boolean } : null, [serialized]);
 const initialized = useRef(new Set<string>());
 const lastPage = useRef("");
 useEffect(() => {
  if (!config?.enabled || !config.consent) {
   window.fbq?.("consent", "revoke"); window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); window.ttq?.revokeConsent(); lastPage.current = ""; return;
  }
  const meta = /^\d+$/.test(config.metaPixelId) ? config.metaPixelId : "";
  if (meta) {
   if (!window.fbq) { const f: Tracker = (...args) => { if (f.callMethod) f.callMethod(...args); else f.queue?.push(args); }; f.queue=[]; f.push=f; f.loaded=true; f.version="2.0"; window.fbq=f; window._fbq=f; load("mya-meta", "https://connect.facebook.net/en_US/fbevents.js"); }
   window.fbq("consent", "grant"); if (!initialized.current.has(meta)) { window.fbq("init", meta); initialized.current.add(meta); }
  }
  const google = [config.ga4Id, config.googleAdsId].filter(id => /^(G|AW)-[A-Z0-9]+$/.test(id));
  if (google.length) { window.dataLayer ||= []; window.gtag ||= function (...args: unknown[]) { void args;
// Google gtag bootstrap consumes an Arguments object in the dataLayer queue.
// eslint-disable-next-line prefer-rest-params
window.dataLayer?.push(arguments); }; window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" }); load("mya-google", `https://www.googletagmanager.com/gtag/js?id=${google[0]}`); if (!initialized.current.has("google")) { window.gtag("js", new Date()); initialized.current.add("google"); } for (const id of google) if (!initialized.current.has(id)) { window.gtag("config", id, { send_page_view: false }); initialized.current.add(id); } }
  if (/^GTM-[A-Z0-9]+$/.test(config.gtmId) && !initialized.current.has(config.gtmId)) { window.dataLayer ||= []; window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" }); load("mya-gtm", `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`); initialized.current.add(config.gtmId); }
  if (/^[A-Z0-9]{10,40}$/i.test(config.tiktokPixelId)) { const id = config.tiktokPixelId; if (!window.ttq) { const queue = [] as unknown as TikQueue; queue.page = () => { queue.push(["page"]); }; queue.track = (event, params) => { queue.push(["track", event, params]); }; queue.grantConsent = () => { queue.push(["grantConsent"]); }; queue.revokeConsent = () => { queue.push(["revokeConsent"]); }; queue._i={}; queue._t={}; queue._o={}; window.ttq=queue; window.TiktokAnalyticsObject="ttq"; } if (!initialized.current.has(id)) { window.ttq._i[id]=[]; window.ttq._i[id]._u="https://analytics.tiktok.com/i18n/pixel/events.js"; window.ttq._t[id]=Date.now(); window.ttq._o[id]={}; load("mya-tiktok", `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`); initialized.current.add(id); } window.ttq.grantConsent(); }
  if (lastPage.current !== pathname) { window.fbq?.("track", "PageView"); window.gtag?.("event", "page_view", { page_path: pathname }); window.ttq?.page(); lastPage.current=pathname; }
  function receive(event: Event) {
   const { eventType, payload } = (event as CustomEvent<{ eventType: AdsEventType; payload: AdsEventPayload }>).detail;
   if (eventType === "PageView") return;
   window.fbq?.("track", eventType, payload, payload.transaction_id ? { eventID: payload.transaction_id } : undefined);
   window.gtag?.("event", eventNames[eventType], { ...payload, items: payload.items?.map(i => ({ item_id: i.id, item_name: i.title, quantity: i.quantity, price: i.price })) });
   window.ttq?.track(eventType === "Purchase" ? "CompletePayment" : eventType, payload);
  }
  window.addEventListener("mya_ads_event", receive); return () => window.removeEventListener("mya_ads_event", receive);
 }, [config, pathname]);
 return null;
}

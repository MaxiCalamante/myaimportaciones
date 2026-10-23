export interface MarketingConfig {
  metaPixelId: string;
  googleAdsId: string;
  ga4Id: string;
  tiktokPixelId: string;
  gtmId: string;
  enabled: boolean;
  testMode: boolean;
}

export const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID || "",
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
  enabled: true,
  testMode: process.env.NODE_ENV !== "production",
};

const STORAGE_KEY = "mya_marketing_config";

export function getMarketingConfig(): MarketingConfig {
  if (typeof window === "undefined") {
    return DEFAULT_MARKETING_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MARKETING_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      metaPixelId: parsed.metaPixelId ?? DEFAULT_MARKETING_CONFIG.metaPixelId,
      googleAdsId: parsed.googleAdsId ?? DEFAULT_MARKETING_CONFIG.googleAdsId,
      ga4Id: parsed.ga4Id ?? DEFAULT_MARKETING_CONFIG.ga4Id,
      tiktokPixelId: parsed.tiktokPixelId ?? DEFAULT_MARKETING_CONFIG.tiktokPixelId,
      gtmId: parsed.gtmId ?? DEFAULT_MARKETING_CONFIG.gtmId,
      enabled: parsed.enabled ?? true,
      testMode: parsed.testMode ?? false,
    };
  } catch {
    return DEFAULT_MARKETING_CONFIG;
  }
}

export function saveMarketingConfig(config: MarketingConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("mya_marketing_config_updated", { detail: config }));
  } catch (err) {
    console.error("Error saving marketing config:", err);
  }
}

export type AdsEventType =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "ViewCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "Contact";

export interface AdsEventPayload {
  contact_type?: "retail" | "wholesale";
  contact_source?: string;
  contact_channel?: "whatsapp";
  advisor?: string;
  category?: string;
  test_event?: boolean;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  quantity?: number;
  num_items?: number;
  transaction_id?: string;
  items?: Array<{
    id?: string;
    title?: string;
    quantity?: number;
    price?: number;
  }>;
  search_string?: string;
  [key: string]: unknown;
}

export const ADS_EVENT_NAMES: Record<AdsEventType, string> = {
  PageView: "page_view", ViewContent: "view_item", AddToCart: "add_to_cart", ViewCart: "view_cart",
  InitiateCheckout: "begin_checkout", Purchase: "purchase", Search: "search", Contact: "contact",
};

export function ga4EventPayload(payload: AdsEventPayload) {
  return {
    ...payload,
    ...(payload.search_string ? { search_term: payload.search_string } : {}),
    ...(payload.items ? { items: payload.items.map(item => ({ item_id: item.id, item_name: item.title, quantity: item.quantity, price: item.price })) } : {}),
  };
}

export function analyticsPageLocation(input: string) {
  const url = new URL(input);
  const path = url.pathname.replace(/^\/pedido\/[^/]+.*$/, "/pedido");
  const safe = new URL(path, url.origin);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 120 && !/[@\r\n]/.test(value)) safe.searchParams.set(key, value);
  }
  return safe.href;
}

type AdsEventDetail = { eventType: AdsEventType; payload: AdsEventPayload; timestamp: string };
let listening = false;
const pendingEvents: AdsEventDetail[] = [];

function hasConsent() {
  try { return localStorage.getItem("mya_analytics_consent") === "granted"; } catch { return false; }
}

export function clearPendingAdsEvents() { pendingEvents.length = 0; }

// Initial product/checkout effects may run before the scripts' listener mounts.
export function subscribeAdsEvents(receive: (event: Event) => void) {
  window.addEventListener("mya_ads_event", receive);
  listening = true;
  for (const detail of pendingEvents.splice(0)) {
    if (hasConsent()) window.dispatchEvent(new CustomEvent("mya_ads_event", { detail }));
  }
  return () => { window.removeEventListener("mya_ads_event", receive); listening = false; };
}

/**
 * Dispatch an analytics / conversion event across all active marketing channels
 * (Meta Pixel, Google Ads / GA4, TikTok Pixel).
 */
export function trackAdsEvent(eventType: AdsEventType, payload: AdsEventPayload = {}): boolean {
  if (typeof window === "undefined") return false;
  const config = getMarketingConfig();

  const eventDetail = {
    eventType,
    payload: {
      currency: "ARS",
      ...payload,
    },
    timestamp: new Date().toISOString(),
  };

  if (payload.test_event === true || config.testMode) {
    window.dispatchEvent(new CustomEvent("mya_ads_test_event", { detail: eventDetail }));
    return false;
  }
  if (!config.enabled || !hasConsent()) return false;
  if (!listening) {
    if (pendingEvents.length >= 20) pendingEvents.shift();
    pendingEvents.push(eventDetail);
  } else window.dispatchEvent(new CustomEvent("mya_ads_event", { detail: eventDetail }));
  return true;
}

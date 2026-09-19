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
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "Contact";

export interface AdsEventPayload {
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
  [key: string]: any;
}

/**
 * Dispatch an analytics / conversion event across all active marketing channels
 * (Meta Pixel, Google Ads / GA4, TikTok Pixel).
 */
export function trackAdsEvent(eventType: AdsEventType, payload: AdsEventPayload = {}): void {
  if (typeof window === "undefined") return;

  const eventDetail = {
    eventType,
    payload: {
      currency: "ARS",
      ...payload,
    },
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent("mya_ads_event", { detail: eventDetail }));
}

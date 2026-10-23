import test from "node:test";
import assert from "node:assert/strict";
import { analyticsPageLocation, ga4EventPayload, trackAdsEvent, subscribeAdsEvents, clearPendingAdsEvents, saveMarketingConfig, DEFAULT_MARKETING_CONFIG } from "../src/lib/analytics";

test("GA4 ecommerce carries exact variant identity, quantities, prices and contact segmentation", () => {
  const payload = ga4EventPayload({ value: 50000, items: [{ id: "p:v", title: "Producto (Variante)", quantity: 2, price: 25000 }] });
  assert.deepEqual(payload.items, [{ item_id: "p:v", item_name: "Producto (Variante)", quantity: 2, price: 25000 }]);
  const contact = ga4EventPayload({ contact_type: "wholesale", contact_source: "wholesale_quote", advisor: "maximo" });
  assert.equal(contact.contact_type, "wholesale");
  assert.ok(!("items" in contact));
});

test("analytics waits for its listener, respects revocation and keeps simulated purchases local", () => {
  const descriptors = new Map(["window", "localStorage", "CustomEvent"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const target = new EventTarget();
  const values = new Map<string, string>();
  const emitted: string[] = [];
  class BrowserEvent extends Event { detail: unknown; constructor(type: string, options: { detail: unknown }) { super(type); this.detail = options.detail; } }
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: target });
    Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: BrowserEvent });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    saveMarketingConfig({ ...DEFAULT_MARKETING_CONFIG, testMode: false });
    assert.equal(trackAdsEvent("AddToCart"), false);
    values.set("mya_analytics_consent", "granted");
    assert.equal(trackAdsEvent("ViewContent", { content_ids: ["real-product"] }), true);
    const off = subscribeAdsEvents(event => emitted.push((event as CustomEvent).detail.eventType));
    assert.deepEqual(emitted, ["ViewContent"]);
    assert.equal(trackAdsEvent("AddToCart"), true);
    assert.equal(trackAdsEvent("Purchase", { test_event: true }), false);
    assert.deepEqual(emitted, ["ViewContent", "AddToCart"]);
    values.set("mya_analytics_consent", "denied");
    assert.equal(trackAdsEvent("Contact", { contact_type: "wholesale" }), false);
    off();
    values.set("mya_analytics_consent", "granted");
    trackAdsEvent("InitiateCheckout");
    values.set("mya_analytics_consent", "denied");
    const stop = subscribeAdsEvents(event => emitted.push((event as CustomEvent).detail.eventType));
    assert.deepEqual(emitted, ["ViewContent", "AddToCart"]);
    stop();
  } finally {
    clearPendingAdsEvents();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("analytics URLs omit purchase credentials, email and free-text searches", () => {
  assert.equal(analyticsPageLocation("https://myaimportaciones.com/seguimiento?email=buyer@example.test&code=private"), "https://myaimportaciones.com/seguimiento");
  assert.equal(analyticsPageLocation("https://myaimportaciones.com/pedido/ORD-PRIVATE?email=buyer@example.test"), "https://myaimportaciones.com/pedido");
  assert.equal(analyticsPageLocation("https://myaimportaciones.com/catalogo?q=private&category=perfumeria&utm_source=instagram"), "https://myaimportaciones.com/catalogo?utm_source=instagram");
});

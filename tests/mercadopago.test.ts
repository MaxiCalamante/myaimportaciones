import test from "node:test";
import assert from "node:assert/strict";
import { buildMercadoPagoPreference, parseMercadoPagoPreference } from "../src/lib/mercadopago-preference";

const now = Date.parse("2026-10-02T15:00:00Z");
const order = { orderId: "order-id", trackingCode: "MYA&test=1", total: 151783, expiresAt: "2026-10-02T16:00:00Z", payerEmail: "buyer@example.test", payerName: "Comprador" };

test("MP charges the confirmed total in ARS and binds all redirects to order tracking", () => {
  const preference = buildMercadoPagoPreference(order, "https://myaimportaciones.vercel.app", now);
  assert.equal(preference.items[0].unit_price, order.total);
  assert.equal(preference.items[0].currency_id, "ARS");
  assert.equal(preference.external_reference, order.orderId);
  assert.equal(preference.metadata.order_id, order.orderId);
  for (const url of Object.values(preference.back_urls)) {
    assert.equal(new URL(url).searchParams.get("code"), order.trackingCode);
    assert.equal(new URL(url).searchParams.size, 1);
  }
  assert.equal(preference.notification_url, "https://myaimportaciones.vercel.app/api/mercadopago/webhook");
});

test("MP rejects invalid totals, expired reservations and insecure return URLs before calling the provider", () => {
  for (const total of [0, -1, NaN, Infinity]) assert.throws(() => buildMercadoPagoPreference({ ...order, total }, "https://myaimportaciones.vercel.app", now));
  for (const expiresAt of ["invalid", "2026-10-02T14:00:00Z"]) assert.throws(() => buildMercadoPagoPreference({ ...order, expiresAt }, "https://myaimportaciones.vercel.app", now));
  assert.throws(() => buildMercadoPagoPreference(order, "http://myaimportaciones.vercel.app", now));
});

test("MP response cannot redirect buyers to a foreign site or accept an incomplete preference", () => {
  const good = { id: "pref-123", init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123" };
  assert.equal(parseMercadoPagoPreference(good)?.preferenceId, good.id);
  for (const init_point of ["javascript:alert(1)", "https://www.mercadopago.com.ar.evil.test/", "http://www.mercadopago.com.ar/", "https://user@www.mercadopago.com.ar/"]) assert.equal(parseMercadoPagoPreference({ ...good, init_point }), null);
  for (const value of [null, {}, { ...good, id: null }, { ...good, init_point: 1 }]) assert.equal(parseMercadoPagoPreference(value), null);
});

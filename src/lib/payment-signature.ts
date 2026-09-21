import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyPaymentSignature(signature: string | null, requestId: string | null, dataId: string, secret: string, now = Date.now()) {
  if (!signature || !requestId || !secret || !dataId) return false;
  const fields = Object.fromEntries(signature.split(",").map(s => s.trim().split("=")));
  if (!/^\d+$/.test(fields.ts ?? "") || !/^[a-f0-9]{64}$/i.test(fields.v1 ?? "")) return false;
  const timestamp = Number(fields.ts) * (fields.ts.length <= 10 ? 1000 : 1);
  if (Math.abs(now - timestamp) > 10 * 60 * 1000) return false;
  const digest = createHmac("sha256", secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${fields.ts};`).digest();
  return timingSafeEqual(digest, Buffer.from(fields.v1, "hex"));
}

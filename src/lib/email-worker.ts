import "server-only";
import { after } from "next/server";
import { createCommerceService } from "./supabase/service";
import { getEmailConfig } from "./email-config";
import { dispatchEmailOutbox } from "./email-dispatch";
export async function processEmailOutbox(orderId?: string) {
  const config = getEmailConfig();
  if (!config.enabled) return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  const db = createCommerceService();
  const started = Date.now();
  const total = { enabled: true, sent: 0, failed: 0, skipped: 0 };
  // Drain small fast batches while reserving time for a slow provider request.
  for (let batch = 0; batch < 3 && Date.now() - started < 10000; batch++) {
    const result = await dispatchEmailOutbox(db, config, orderId);
    total.sent += result.sent; total.failed += result.failed; total.skipped += result.skipped;
    if (result.sent + result.failed + result.skipped < 4) break;
  }
  return total;
}
export function scheduleTransactionalEmails(orderId?: string) {
  if (!getEmailConfig().enabled) return;
  after(async () => {
    try { await processEmailOutbox(orderId); }
    catch { console.error("No se pudo procesar la cola de emails; revisar /admin/emails."); }
  });
}

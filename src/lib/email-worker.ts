import "server-only";
import { after } from "next/server";
import { createCommerceService } from "./supabase/service";
import { getEmailConfig } from "./email-config";
import { dispatchEmailOutbox } from "./email-dispatch";
export async function processEmailOutbox(orderId?: string) {
  const config = getEmailConfig();
  if (!config.enabled) return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  return dispatchEmailOutbox(createCommerceService(), config, orderId);
}
export function scheduleTransactionalEmails(orderId?: string) {
  if (!getEmailConfig().enabled) return;
  after(async () => {
    try { await processEmailOutbox(orderId); }
    catch { console.error("No se pudo procesar la cola de emails; revisar /admin/emails."); }
  });
}

import { resolveSiteOrigin } from "./site-origin";
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}
export function getEmailConfig(env: Record<string, string | undefined> = process.env) {
  const recipients = [...new Set((env.ADMIN_NOTIFICATION_EMAILS || "maximocalamante14@gmail.com,agustinagil009@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))];
  const from = (env.RESEND_FROM_EMAIL || "").trim();
  const address = from.match(/<([^<>]+)>$/)?.[1] || from;
  const domain = address.split("@")[1]?.toLowerCase();
  const origin = resolveSiteOrigin(env.NEXT_PUBLIC_SITE_URL);
  let validOrigin = false;
  try { const url = new URL(env.NEXT_PUBLIC_SITE_URL || origin); validOrigin = url.protocol === "https:" && !url.username && !url.password; } catch {}
  const problems = [
    env.TRANSACTIONAL_EMAILS_ENABLED !== "true" ? "Los envíos están desactivados." : "",
    !env.RESEND_API_KEY ? "Falta la clave privada de Resend." : "",
    env.RESEND_DOMAIN_VERIFIED !== "true" ? "Falta confirmar el dominio verificado en Resend." : "",
    !validEmail(address) || /[\r\n]/.test(from) || !domain || ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "resend.dev"].includes(domain) || domain.endsWith("vercel.app") ? "Falta un remitente de dominio propio." : "",
    !recipients.length || recipients.length > 10 || recipients.some(r => !validEmail(r)) ? "Revisá los emails administrativos." : "",
    !validOrigin ? "Falta la URL HTTPS de la tienda." : "",
    !validEmail(env.RESEND_REPLY_TO_EMAIL || "maximocalamante14@gmail.com") ? "Revisá el email de respuesta." : "",
  ].filter(Boolean);
  return { enabled: problems.length === 0, problems, from, recipients, origin, replyTo: env.RESEND_REPLY_TO_EMAIL || "maximocalamante14@gmail.com", apiKey: env.RESEND_API_KEY || "" };
}

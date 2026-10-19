// Supabase supplies and validates all authentication tokens. No application tokens.
import { mkdir, writeFile } from "node:fs/promises";
const directory = new URL("../supabase/templates/", import.meta.url);
await mkdir(directory, { recursive: true });
const templates = [
  ["confirmation", "Confirmá tu cuenta", "Confirmá tu email para terminar de crear tu cuenta en MYA.", "Confirmar mi cuenta"],
  ["recovery", "Recuperá tu contraseña", "Recibimos una solicitud para recuperar el acceso a tu cuenta. Abrí el enlace para elegir una nueva contraseña.", "Elegir nueva contraseña"],
  ["invite", "Te invitaron a MYA", "Recibiste una invitación para acceder a MYA Importaciones. Aceptala desde el enlace seguro.", "Aceptar invitación"],
  ["magic_link", "Tu enlace de acceso", "Usá este enlace para ingresar a tu cuenta. El enlace es personal y de un solo uso.", "Ingresar a mi cuenta"],
  ["email_change", "Confirmá el cambio de email", "Recibimos una solicitud para cambiar el email de tu cuenta. Confirmá el cambio desde el enlace seguro.", "Confirmar cambio"],
  ["reauthentication", "Tu código de verificación", "Usá este código para confirmar tu identidad: {{ .Token }}. No lo compartas con nadie."],
  ["password_changed_notification", "Se cambió tu contraseña", "La contraseña de tu cuenta fue modificada. Si no fuiste vos, recuperá el acceso y contactanos cuanto antes."],
  ["email_changed_notification", "Se cambió el email de tu cuenta", "El email de tu cuenta fue modificado. Si no solicitaste el cambio, contactanos cuanto antes."],
  ["phone_changed_notification", "Se cambió tu teléfono", "El teléfono de tu cuenta fue modificado. Si no solicitaste el cambio, contactanos cuanto antes."],
  ["identity_linked_notification", "Se agregó una forma de ingreso", "Se vinculó una nueva forma de ingreso a tu cuenta. Si no fuiste vos, contactanos cuanto antes."],
  ["identity_unlinked_notification", "Se quitó una forma de ingreso", "Se desvinculó una forma de ingreso de tu cuenta. Si no fuiste vos, contactanos cuanto antes."],
  ["mfa_factor_enrolled_notification", "Se agregó un método de verificación", "Se agregó un método de verificación a tu cuenta. Si no fuiste vos, contactanos cuanto antes."],
  ["mfa_factor_unenrolled_notification", "Se quitó un método de verificación", "Se quitó un método de verificación de tu cuenta. Si no fuiste vos, contactanos cuanto antes."],
];
const config = {};
for (const [key, title, message, button] of templates) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:auto;background:white;border-radius:16px"><tr><td style="padding:28px;background:#18181b;color:white;border-radius:16px 16px 0 0;font-size:23px;font-weight:bold">MYA Importaciones</td></tr><tr><td style="padding:28px;overflow-wrap:anywhere"><h1 style="font-size:24px">${title}</h1><p style="line-height:1.65">${message}</p>${button ? `<p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 20px;background:#075985;border-radius:10px;color:white;text-decoration:none;font-weight:bold">${button}</a></p><p style="font-size:13px;line-height:1.6">Si no solicitaste esta acción, podés ignorar este email. No compartas el enlace con nadie.</p>` : ""}<p style="line-height:1.65">¿Necesitás ayuda? Escribinos a <a href="mailto:maximocalamante14@gmail.com">maximocalamante14@gmail.com</a>.</p><p style="border-top:1px solid #e4e4e7;padding-top:20px;font-size:12px;color:#71717a">MYA Importaciones · Tandil, Buenos Aires · <a href="https://myaimportaciones.com">myaimportaciones.com</a></p></td></tr></table></td></tr></table></body></html>`;
  await writeFile(new URL(`${key}.html`, directory), html + "\n");
  config[`mailer_subjects_${key}`] = `${title} | MYA Importaciones`;
  config[`mailer_templates_${key}_content`] = html;
}
// This file has no secrets and does not enable SMTP, confirmations or notifications.
await writeFile(new URL("auth-config.json", directory), JSON.stringify(config, null, 2) + "\n");
console.log(`Prepared ${templates.length} Supabase Auth templates.`);

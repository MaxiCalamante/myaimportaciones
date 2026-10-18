import { OFFICIAL_ORIGIN } from "./site-origin";

const oldHosts = ["myaimportaciones.vercel.app", "tienda-mayorista-minorista.vercel.app", "www.myaimportaciones.com"];
const legacySessionPaths = /^\/(api|auth|login|register|cuenta|checkout|seguimiento|recuperar-clave|restablecer-clave)(\/|$)/;
export function canonicalRedirect(url: URL, method: string) {
  // Existing callbacks, private sessions and signed POST webhooks remain usable on their original host.
  if (!oldHosts.includes(url.hostname) || !["GET", "HEAD"].includes(method) || legacySessionPaths.test(url.pathname)) return null;
  return new URL(url.pathname + url.search, OFFICIAL_ORIGIN);
}

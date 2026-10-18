export const OFFICIAL_ORIGIN = "https://myaimportaciones.com";

// Local fixtures keep their own callbacks; every hosted environment uses the official identity.
export function resolveSiteOrigin(configured?: string) {
  try {
    const url = new URL(configured || OFFICIAL_ORIGIN);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password) return url.origin;
  } catch { /* Invalid configuration must never become a public link. */ }
  return OFFICIAL_ORIGIN;
}

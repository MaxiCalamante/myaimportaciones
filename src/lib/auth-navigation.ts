export function safeAuthNext(value: unknown, fallback = "/cuenta") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\x00-\x20]/.test(decoded)) return fallback;
    const url = new URL(value, "https://mya.local");
    return url.origin === "https://mya.local" ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}

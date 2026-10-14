export function validInstagramPhoto(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4000) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443')
      && /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(u.hostname);
  } catch { return false; }
}

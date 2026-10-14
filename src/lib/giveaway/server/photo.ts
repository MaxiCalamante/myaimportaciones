import sharp from 'sharp';
import { validInstagramPhoto } from '../photos';
export async function instagramPhoto(src: unknown, request: typeof fetch = fetch) {
  if (!validInstagramPhoto(src)) return null;
  const r = await request(src, { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(5000), cache: 'no-store' });
  if (!r.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(r.headers.get('content-type') || '') || Number(r.headers.get('content-length') || 0) > 2_000_000) return null;
  const reader = r.body?.getReader(); if (!reader) return null;
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.length;
    if (size > 2_000_000) { await reader.cancel(); return null; }
    chunks.push(next.value);
  }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 4_000_000, animated: false }).resize(512,512,{fit:'cover',withoutEnlargement:true}).png().toBuffer();
}

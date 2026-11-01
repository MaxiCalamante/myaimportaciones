import { parsePublicAmount, type PublicProduct } from './supplier-public-data';

const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:0*39|x0*27);/gi, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const text = (value: string) => decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag: string, name: string) => decode(tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? '');

/** Atlantico's public primary page: require URL, canonical, form ID and heading to agree. */
export function atlanticoPublicProduct(html: string, sourceUrl: string): PublicProduct | null {
  const url = new URL(sourceUrl), id = url.searchParams.get('product_id');
  if (!/^\d+$/.test(id ?? '') || url.searchParams.get('route') !== 'product/product') return null;
  const tags = [...html.matchAll(/<(?:link|input)\b[^>]*>/gi)].map(m => m[0]);
  const canonical = tags.find(tag => attr(tag, 'rel') === 'canonical');
  const formIds = tags.filter(tag => attr(tag, 'name') === 'product_id').map(tag => attr(tag, 'value'));
  if (!canonical || formIds.length !== 1 || formIds[0] !== id) return null;
  try {
    const own = new URL(attr(canonical, 'href'));
    if (own.hostname !== url.hostname || own.searchParams.get('product_id') !== id || own.searchParams.get('route') !== 'product/product') return null;
  } catch { return null; }
  const heading = /<h1\b[^>]*class=["'][^"']*\bproduct-name\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!heading || !text(heading[1])) return null;
  const tail = html.slice(heading.index + heading[0].length);
  const end = tail.search(/<div\b[^>]*id=["']product["']/i);
  if (end < 0) return null;
  const block = tail.slice(0, end);
  const stockTag = /<span\b[^>]*id=["']cuadro_stock["'][^>]*>([\s\S]*?)<\/span>/i.exec(block);
  const stock = text(stockTag?.[1] ?? '').toLowerCase();
  const availability = stock === 'en stock' ? 'in_stock' : /^(agotado|sin stock|fuera de stock|no disponible)$/.test(stock) ? 'out_of_stock' : 'unknown';
  const currencyButton = /<button\b[^>]*class=["'][^"']*\bbtn-currency\b[^"']*["'][^>]*>([\s\S]*?)<\/button>/i.exec(html);
  const usd = /<strong>\s*USD\s*<\/strong>/i.test(currencyButton?.[1] ?? '');
  const priceBlock = /<li\b[^>]*class=["']price["'][^>]*>([\s\S]*?)<\/li>/i.exec(block);
  const price = usd ? parsePublicAmount(text(priceBlock?.[1] ?? '')) : null;
  const brand = text(block.match(/<li>\s*Marca:\s*([\s\S]*?)<\/li>/i)?.[1] ?? '');
  return { external_id: id!, variant_key: 'base', title: text(heading[1]), brand, model: '', source_url: sourceUrl, origin_cost: price, currency: price ? 'USD' : null, availability };
}

import { load } from 'cheerio/slim';
import { categoryIdentity, clean, sourceUrl, type CatalogCategory, type FoundProduct, type SupplierAdapter } from './adapters/shared';
import type { SupplierKey } from '../supplier-url-policy';
import { identityTokens } from '../supplier-matching';

const beauty = /perfum|cosmetic|skincare|skin-care|maquiag|cuidado.pessoal|beleza|higiene|capilar|prote[cç][aã]o.solar/i;
const connectRoots = new Set(['games', 'smartphones', 'informatica', 'eletronicos', 'eletroportateis']);
const totalExcluded = /^(?:acampamento|camping|electronicos|cozinha|eletroportateis)-*$/i;
const paging = /^(?:p|page|pagina|start|offset)$/;

export function catalogCategoryAllowed(key: SupplierKey, { url, title }: CatalogCategory) {
  const { pathname, searchParams } = new URL(url);
  if ([...searchParams.keys()].some(param => paging.test(param))) return false;
  if (key === 'atacado-connect') {
    const [, , root] = pathname.split('/');
    return !searchParams.size && connectRoots.has(root);
  }
  if (key === 'total') {
    const [, , slug] = pathname.split('/');
    return /^\d+$/.test(searchParams.get('d') ?? '') && searchParams.size === 1 && !totalExcluded.test(slug);
  }
  if (searchParams.size) return false;
  if (key === 'star-company' && /^\/categoria-premium\/(?:100|121)\/?$/.test(pathname)) return true;
  return beauty.test(decodeURIComponent(pathname) + ' ' + title.normalize('NFD').replace(/\p{Diacritic}/gu, ''));
}

export function catalogCategories(adapter: SupplierAdapter, links: CatalogCategory[]) {
  return [...new Map(links
    .filter(link => adapter.category(link.url) && catalogCategoryAllowed(adapter.key, link))
    .map(link => {
      const url = categoryIdentity(link.url, adapter.key);
      const fallback = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '').replace(/-+/g, ' ');
      const starLabel = adapter.key === 'star-company' && ({ '100': 'Cosméticos', '121': 'Perfumes' } as Record<string,string>)[fallback];
      return [url, { url, title: starLabel || clean(link.title) || fallback }];
    })).values()];
}

export function catalogSitemapCategories(xml: string, url: string, adapter: SupplierAdapter) {
  const $ = load(xml, { xmlMode: true });
  const links = $('urlset > url > loc').toArray().flatMap(node => {
    const raw=$(node).text().trim();
    if (!raw.includes('/categoria/')) return [];
    try {
      return [{ url: sourceUrl(raw, url, adapter.key), title: '' }];
    } catch {
      return [];
    }
  });
  return catalogCategories(adapter, links);
}

export function catalogExclusion(key: SupplierKey, item: FoundProduct): string | null {
  const title = item.title.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(?:vapes?|pods? descartave[li]s?|e-liquid|munic[aã]o|municiones|agrotoxico|pesticida|herbicida|arma de fogo|arma de fuego|airsoft|chumbinho|airgun|carabina de pressao)\b/i.test(title)) {
    return 'Referencia fuera del alcance comercial autorizado.';
  }
  if (key === 'atacado-connect' && /\biphone\b/i.test(title) && /\b(?:cpo|outlet|refurbished|recondicionado|reacondicionado|usado|seminovo|ativado|activado|open box)\b/i.test(title)) {
    return 'iPhone fuera de la condición comercial autorizada.';
  }
  // Hardware loose consumables exclusion (screws, nuts, washers, rivets, loose nails, motor brushes)
  // Preserves bench vises (tornillo de banco), bolt cutters, extractors, hammers, nailers, sets/kits/boxes
  if (key === 'total' || /\b(?:total|wadfow)\b/i.test(title)) {
    const isLooseScrew = /\btornillos?\b/i.test(title) && !/\b(?:banco|prensa|cortador|corta|extractor|juego|kit|set|caja|maletin)\b/i.test(title);
    const isLooseHardware = /\b(?:arandelas?|tuercas?|remaches?|carbones)\b/i.test(title) && !/\b(?:remachadora|juego|kit|set|caja|maletin)\b/i.test(title);
    const isLooseNails = /\bclavos?\b/i.test(title) && !/\b(?:martillo|clavadora|engrapadora|juego|kit|set|caja|maletin)\b/i.test(title);
    if (isLooseScrew || isLooseHardware || isLooseNails) {
      return 'Consumible menor / ferretería suelta sin viabilidad de importación.';
    }
  }
  return null;
}

export function conflictingListingTitle(key: SupplierKey, listingTitle: unknown, detailTitle: string): string|null {
  if (key!=='atacado-usa'||typeof listingTitle!=='string'||/…|\.\.\./.test(listingTitle)) return null;
  return JSON.stringify(identityTokens(listingTitle))!==JSON.stringify(identityTokens(detailTitle))?listingTitle:null;
}

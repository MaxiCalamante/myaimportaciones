/** Public channel switch. Keep the B2B implementation dormant until its launch review. */
export const WHOLESALE_ENABLED = process.env.NEXT_PUBLIC_WHOLESALE_ENABLED !== "false";
export const MAX_ORDER_QUANTITY = 100;
export const MAX_ORDER_LINES = 50;

const EXCLUDED_CATEGORY_SLUGS: readonly string[] = [];
export function isExcludedCategory(slug: string) {
  return EXCLUDED_CATEGORY_SLUGS.includes(slug);
}

export function purchasableQuantity(product: { stock: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean }) {
  if (product.fulfillmentMode === "supplier") return product.supplierAvailable ? MAX_ORDER_QUANTITY : 0;
  return product.stockVerifiedAt ? Math.max(0, Math.min(MAX_ORDER_QUANTITY, product.stock)) : 0;
}
export function isVerifiedStock(product: { stock: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean }) {
  if (product.fulfillmentMode === "supplier") return Boolean(product.supplierAvailable);
  return product.stock > 0 && Boolean(product.stockVerifiedAt);
}

export function cleanProductTitle(title: string) {
  return title.replace(/^(MEDICUBE|SKIN1004|KARSEELL|ANUA|CELIMAX)\s+\1\s+/i, "$1 ").replace(/\s*\/$/, "").trim();
}

export interface CommercialPolicySubject {
  isActive?: boolean;
  active?: boolean;
  deletedAt?: string | null;
  commercialStatus?: string | null;
  fulfillmentMode?: string | null;
  supplierAvailable?: boolean | null;
  stock?: number | null;
  sourceUrl?: string | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  totalCostUsd?: number | null;
  retailUsd?: string | number | null;
  wholesaleUsd?: string | number | null;
  categorySlug?: string | null;
  isWholesaleOnly?: boolean | null;
  wholesaleOnly?: boolean | null;
}

/**
 * Centralized public eligibility policy for MYA Importaciones storefront, search, catalog and checkout.
 * Returns true only if product meets all commercial, stock and profitability safety checks.
 */
export function isPubliclyEligible(product: CommercialPolicySubject, options?: { admin?: boolean; wholesale?: boolean }): boolean {
  if (options?.admin) return true;
  if (product.deletedAt) return false;
  const active = product.active ?? product.isActive ?? true;
  if (!active) return false;

  if (product.categorySlug && isExcludedCategory(product.categorySlug)) return false;

  const wholesaleOnly = product.wholesaleOnly ?? product.isWholesaleOnly ?? false;
  if (!WHOLESALE_ENABLED && !options?.wholesale && wholesaleOnly) return false;

  // Commercial status must be AVAILABLE
  if (product.commercialStatus && product.commercialStatus !== 'AVAILABLE') {
    return false;
  }

  // Stock / fulfillment check
  if (product.fulfillmentMode === 'supplier') {
    // If supplier confirms out of stock and own stock <= 0, not eligible (when not explicitly overridden)
    if (product.supplierAvailable === false && !product.commercialStatus && (product.stock === null || product.stock === undefined || product.stock <= 0)) {
      return false;
    }
    // Cannot be verified without source_url when physical stock is 0
    if (product.sourceUrl !== undefined && (!product.sourceUrl || product.sourceUrl.trim() === '') && (product.stock === null || product.stock === undefined || product.stock <= 0)) {
      return false;
    }
  } else if (product.fulfillmentMode === 'own_stock') {
    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      return false;
    }
  }

  // Margin safety check: Retail or wholesale must not sell below total cost
  const cost = Number(product.totalCostUsd);
  if (Number.isFinite(cost) && cost > 0) {
    const retail = Number(product.retailUsd);
    if (Number.isFinite(retail) && retail > 0 && retail < cost) {
      return false;
    }
    const wholesale = Number(product.wholesaleUsd);
    if (options?.wholesale && Number.isFinite(wholesale) && wholesale > 0 && wholesale < cost) {
      return false;
    }
  }

  return true;
}

/**
 * High-ticket classification:
 * Electronics, consoles, notebooks or any item with acquisition cost >= 600 USD.
 */
export function isHighTicketCost(costUsd: number | null | undefined): boolean {
  return typeof costUsd === 'number' && Number.isFinite(costUsd) && costUsd >= 600;
}

export interface ScaledMarginRecommendation {
  channel: 'retail' | 'wholesale';
  targetMarginPercent: number;
  minimumMarginPercent: number;
  isHighTicket: boolean;
  fixedContributionUsd?: number;
}

/**
 * Calculates competitive scaled contribution margin targets.
 * Standard items apply 30% retail / 18% wholesale.
 * High-ticket items (>= 600 USD) scale down to 12-15% retail / 10% wholesale
 * to remain competitive in Argentina without selling below cost or violating the 10% floor.
 */
export function getRecommendedMargin(
  costUsd: number,
  channel: 'retail' | 'wholesale' = 'retail'
): ScaledMarginRecommendation {
  const isHigh = isHighTicketCost(costUsd);
  const floor = 10; // Floor invariant across the entire system

  if (channel === 'wholesale') {
    if (isHigh) {
      return {
        channel: 'wholesale',
        targetMarginPercent: 10,
        minimumMarginPercent: floor,
        isHighTicket: true,
        fixedContributionUsd: 60,
      };
    }
    return {
      channel: 'wholesale',
      targetMarginPercent: 18,
      minimumMarginPercent: floor,
      isHighTicket: false,
    };
  }

  // Retail channel
  if (costUsd >= 1000) {
    return {
      channel: 'retail',
      targetMarginPercent: 12,
      minimumMarginPercent: floor,
      isHighTicket: true,
      fixedContributionUsd: 120,
    };
  }
  if (costUsd >= 600) {
    return {
      channel: 'retail',
      targetMarginPercent: 15,
      minimumMarginPercent: floor,
      isHighTicket: true,
      fixedContributionUsd: 90,
    };
  }
  if (costUsd >= 300) {
    return {
      channel: 'retail',
      targetMarginPercent: 22,
      minimumMarginPercent: floor,
      isHighTicket: false,
    };
  }

  return {
    channel: 'retail',
    targetMarginPercent: 30,
    minimumMarginPercent: floor,
    isHighTicket: false,
  };
}



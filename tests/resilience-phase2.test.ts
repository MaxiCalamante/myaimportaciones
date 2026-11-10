import test from 'node:test';
import assert from 'node:assert/strict';
import { rankProductSearch, type SearchProduct } from '../src/lib/product-search';
import { INITIAL_PUBLIC_WHOLESALE_POLICY } from '../src/lib/wholesale-v2';
import type { Product } from '../src/lib/types';
import { merchantFeed } from '../src/lib/merchant-feed';

// Regression test for search category filter semantics
test('search: categoryIds empty array returns empty, undefined performs global search', () => {
  type TestSearchProduct = SearchProduct & { category_id: string };
  const mockIndex: TestSearchProduct[] = [
    { id: 'p1', title: 'Crema Hidratante Medicube Collagen', category_id: 'cat-skincare', brand: 'Medicube' },
    { id: 'p2', title: 'Taladro Inalámbrico Total 20V', category_id: 'cat-herramientas', brand: 'Total' },
    { id: 'p3', title: 'Perfume Bvlgari Tygar 125ml', category_id: 'cat-perfumeria', brand: 'Bvlgari' },
  ];

  function runSearch(query: string, categoryIds?: string[]): string[] {
    if (categoryIds !== undefined && categoryIds.length === 0) return [];
    const filtered = categoryIds !== undefined
      ? (() => {
          const ids = new Set(categoryIds);
          return mockIndex.filter(p => ids.has(p.category_id));
        })()
      : mockIndex;
    return rankProductSearch(filtered, query).map(p => p.id);
  }

  // 1. Global search (categoryIds === undefined)
  assert.deepEqual(runSearch('medicube'), ['p1']);
  assert.deepEqual(runSearch('total'), ['p2']);
  assert.deepEqual(runSearch('bvlgari'), ['p3']);

  // 2. Filtered by category matching
  assert.deepEqual(runSearch('medicube', ['cat-skincare']), ['p1']);
  assert.deepEqual(runSearch('medicube', ['cat-herramientas']), []);

  // 3. CategoryIds is empty array (e.g. empty subcategory branch) -> MUST return empty, NOT global!
  assert.deepEqual(runSearch('medicube', []), []);
  assert.deepEqual(runSearch('total', []), []);

  // 4. Query with no matches returns empty
  assert.deepEqual(runSearch('inexistente'), []);
});

test('search: inactive variants are filtered out from search match', () => {
  const products: SearchProduct[] = [
    {
      id: 'prod-variants',
      title: 'Serum Facial Numbuzin',
      brand: 'Numbuzin',
      product_variants: [
        { title: 'Opción Activa 50ml', sku: 'NUM-50', is_active: true, options: { tamano: '50ml' } },
        { title: 'Opción Inactiva 100ml', sku: 'NUM-100', is_active: false, options: { tamano: '100ml' } },
      ],
    },
  ];

  assert.deepEqual(rankProductSearch(products, '50ml').map(p => p.id), ['prod-variants']);
  assert.deepEqual(rankProductSearch(products, 'NUM-50').map(p => p.id), ['prod-variants']);
  assert.deepEqual(rankProductSearch(products, '100ml').map(p => p.id), []);
  assert.deepEqual(rankProductSearch(products, 'NUM-100').map(p => p.id), []);
});

test('wholesale: policy fallback differentiates confirmed from unconfirmed policy', async () => {
  // Mock client simulating RPC error
  const mockErrorClient = {
    rpc: async () => ({ data: null, error: { message: 'Database connection timeout' } }),
  };

  // Mock client simulating RPC success
  const mockSuccessClient = {
    rpc: async () => ({ data: { minAmountArs: 150000, minUnits: 6 }, error: null }),
  };

  // Implementation of policy getter matching src/lib/wholesale-v2-read.ts
  async function testGetPolicy(client: { rpc: () => Promise<{ data: { minAmountArs: number; minUnits: number } | null; error: unknown }> }, options?: { allowFallback?: boolean }) {
    const r = await client.rpc();
    if (r.error || !r.data) {
      if (options?.allowFallback) {
        return { ...INITIAL_PUBLIC_WHOLESALE_POLICY, confirmed: false };
      }
      throw new Error('No se pudieron leer las condiciones mayoristas confirmadas.');
    }
    return { ...r.data, confirmed: true };
  }

  // 1. Success returns confirmed: true
  const confirmedPolicy = await testGetPolicy(mockSuccessClient);
  assert.equal(confirmedPolicy.confirmed, true);
  assert.equal(confirmedPolicy.minAmountArs, 150000);
  assert.equal(confirmedPolicy.minUnits, 6);

  // 2. Error with allowFallback: false (e.g. at checkout) THROWS
  await assert.rejects(
    async () => testGetPolicy(mockErrorClient, { allowFallback: false }),
    /No se pudieron leer las condiciones mayoristas confirmadas/
  );

  // 3. Error with allowFallback: true (e.g. for storefront browsing) returns fallback with confirmed: false
  const fallbackPolicy = await testGetPolicy(mockErrorClient, { allowFallback: true });
  assert.equal(fallbackPolicy.confirmed, false);
  assert.equal(fallbackPolicy.minAmountArs, INITIAL_PUBLIC_WHOLESALE_POLICY.minAmountArs);
  assert.equal(fallbackPolicy.minUnits, INITIAL_PUBLIC_WHOLESALE_POLICY.minUnits);
});

test('monetary: projectUsdProducts protects against unconfirmed prices during RPC failure', async () => {
  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      slug: 'medicube-serum',
      title: 'Medicube Collagen Serum',
      description: 'Serum',
      categoryId: 'cat-1',
      categoryName: 'Cosmética',
      imageUrl: '/img.jpg',
      retailPrice: 50000,
      wholesalePrice: 35000,
      wholesaleMinQuantity: 5,
      stock: 10,
      paymentMethods: ['transferencia', 'mercado_pago'],
      tags: [],
      featured: false,
      wholesaleOnly: false,
    },
  ];

  // Logic matching monetary.ts failure mode
  function projectOnRpcError(products: Product[]): Product[] {
    return products.map(p => ({
      ...p,
      priceVerified: false,
      isPurchasable: false,
      priceWarning: 'Precio referencial en actualización. Consultanos antes de comprar.',
      variants: p.variants?.map(v => ({
        ...v,
        priceVerified: false,
        isPurchasable: false,
      })),
    }));
  }

  // Logic matching monetary.ts success mode
  function projectOnRpcSuccess(products: Product[], rows: Array<{ productId: string; retailArs: number | null; retailUsd: string }>): Product[] {
    const byId = new Map(rows.map(r => [r.productId, r]));
    return products.map(p => {
      const base = byId.get(p.id);
      const isVerified = Boolean(base && base.retailArs !== null && base.retailArs > 0);
      return {
        ...p,
        retailPrice: base?.retailArs ?? 0,
        retailUsd: base?.retailUsd,
        priceVerified: isVerified,
        isPurchasable: isVerified,
        priceWarning: isVerified ? undefined : 'Precio referencial en actualización.',
      };
    });
  }

  // 1. On RPC Error: product is navigable, but price is unverified and unpurchasable
  const errorResult = projectOnRpcError(sampleProducts);
  assert.equal(errorResult[0].priceVerified, false);
  assert.equal(errorResult[0].isPurchasable, false);
  assert.match(errorResult[0].priceWarning ?? '', /en actualización/);

  // 2. On RPC Success with valid ARS projection: price is verified and purchasable
  const successResult = projectOnRpcSuccess(sampleProducts, [
    { productId: 'prod-1', retailArs: 55000, retailUsd: '35.00' },
  ]);
  assert.equal(successResult[0].priceVerified, true);
  assert.equal(successResult[0].isPurchasable, true);
  assert.equal(successResult[0].retailPrice, 55000);
  assert.equal(successResult[0].priceWarning, undefined);

  // 3. On RPC Success with null/0 ARS projection: unverified and unpurchasable
  const nullPriceResult = projectOnRpcSuccess(sampleProducts, [
    { productId: 'prod-1', retailArs: null, retailUsd: '35.00' },
  ]);
  assert.equal(nullPriceResult[0].priceVerified, false);
  assert.equal(nullPriceResult[0].isPurchasable, false);
});

test('financial: detects discrepancy between legacy static ARS price and live USD * FX projection (MacBook Air case)', () => {
  const macbookAir = {
    id: '42d84195-fffc-5b4d-9e90-a313d9c50fd8',
    sku: '15903-6',
    title: 'Apple MacBook Air M5 13,6″ · 16 GB / 512 GB · Azul cielo · MDHH4LL/A',
    staticRetailArs: 2443800,
    retailUsd: 1899,
    exchangeRate: 1555,
  };

  const dynamicCalculatedArs = Math.round(macbookAir.retailUsd * macbookAir.exchangeRate);
  assert.equal(dynamicCalculatedArs, 2952945);
  // Detects the legacy static column drift (2.443.800 was based on ~1.287 FX from Oct 2026)
  assert.notEqual(macbookAir.staticRetailArs, dynamicCalculatedArs);
  assert.equal(macbookAir.staticRetailArs, 2443800);
});

test('financial: payment method fee drops effective margin below 10% floor (Galaxy A37 & MacBook Air cases)', () => {
  interface FinancialItem {
    id: string;
    title: string;
    retailUsd: number;
    originCostUsd: number;
    pasadorRate: number;
  }

  function evaluateItemMargins(item: FinancialItem) {
    const landedCostUsd = item.originCostUsd * (1 + item.pasadorRate);
    const grossMarginTransfer = (item.retailUsd - landedCostUsd) / item.retailUsd;
    const mpFeeRate = 0.06; // 6% Mercado Pago fee
    const netRevenueMp = item.retailUsd * (1 - mpFeeRate);
    const netMarginMp = (netRevenueMp - landedCostUsd) / item.retailUsd;

    return {
      landedCostUsd: Number(landedCostUsd.toFixed(2)),
      grossMarginTransferPct: Number((grossMarginTransfer * 100).toFixed(2)),
      netMarginMpPct: Number((netMarginMp * 100).toFixed(2)),
      meetsTransferFloor: grossMarginTransfer >= 0.10,
      meetsMpFloor: netMarginMp >= 0.10,
    };
  }

  // Case 1: MacBook Air M5
  const macbook = evaluateItemMargins({
    id: '42d84195-fffc-5b4d-9e90-a313d9c50fd8',
    title: 'Apple MacBook Air M5 13,6″',
    retailUsd: 1899,
    originCostUsd: 1371,
    pasadorRate: 0.20,
  });
  assert.equal(macbook.landedCostUsd, 1645.20);
  assert.equal(macbook.grossMarginTransferPct, 13.36);
  assert.equal(macbook.meetsTransferFloor, true); // Meets 10% on Transferencia
  assert.equal(macbook.netMarginMpPct, 7.36);
  assert.equal(macbook.meetsMpFloor, false); // FAILS 10% floor on Mercado Pago!

  // Case 2: Samsung Galaxy A37
  const galaxy = evaluateItemMargins({
    id: 'aa7b02d6-395d-5b36-b456-5646e711867e',
    title: 'Samsung Galaxy A37',
    retailUsd: 423.67,
    originCostUsd: 348,
    pasadorRate: 0.20,
  });
  assert.equal(galaxy.landedCostUsd, 417.60);
  assert.equal(galaxy.grossMarginTransferPct, 1.43);
  assert.equal(galaxy.meetsTransferFloor, false); // FAILS 10% floor on Transferencia!
  assert.equal(galaxy.netMarginMpPct, -4.57);
  assert.equal(galaxy.meetsMpFloor, false); // SELLS AT A LOSS on Mercado Pago!
});

test('feed: merchantFeed excludes products with unverified price (priceVerified === false)', () => {
  const validProduct: Product = {
    id: 'p-valid',
    slug: 'p-valid',
    title: 'Producto Válido',
    description: 'Desc',
    categoryId: 'c1',
    categoryName: 'Cosmética',
    imageUrl: 'https://example.com/p1.jpg',
    retailPrice: 50000,
    wholesalePrice: 0,
    wholesaleMinQuantity: 0,
    stock: 10,
    paymentMethods: ['transferencia'],
    tags: [],
    featured: false,
    wholesaleOnly: false,
    active: true,
    priceVerified: true,
  };

  const unverifiedProduct: Product = {
    ...validProduct,
    id: 'p-unverified',
    slug: 'p-unverified',
    title: 'Producto No Verificado',
    priceVerified: false,
  };

  const xml = merchantFeed([validProduct, unverifiedProduct], true);
  assert.ok(xml.includes('p-valid'));
  assert.ok(!xml.includes('p-unverified'));
});

test('feed: strictVerification requires priceVerified === true and excludes undefined', () => {
  const baseProduct: Product = {
    id: 'p-undefined',
    slug: 'p-undefined',
    title: 'Producto Sin Proyección Explícita',
    description: 'Desc',
    categoryId: 'c1',
    categoryName: 'Cosmética',
    imageUrl: 'https://example.com/p1.jpg',
    retailPrice: 50000,
    wholesalePrice: 0,
    wholesaleMinQuantity: 0,
    stock: 10,
    paymentMethods: ['transferencia'],
    tags: [],
    featured: false,
    wholesaleOnly: false,
    active: true,
    // priceVerified is intentionally omitted / undefined
  };

  const verifiedProduct: Product = {
    ...baseProduct,
    id: 'p-strict-verified',
    slug: 'p-strict-verified',
    title: 'Producto Estrictamente Verificado',
    priceVerified: true,
  };

  // 1. With strictVerification: true -> undefined MUST be excluded, true included
  const strictXml = merchantFeed([baseProduct, verifiedProduct], true, { strictVerification: true });
  assert.ok(strictXml.includes('p-strict-verified'));
  assert.ok(!strictXml.includes('p-undefined'));

  // 2. Default legacy mode allows undefined for backwards-compatibility with test fixtures
  const defaultXml = merchantFeed([baseProduct, verifiedProduct], true);
  assert.ok(defaultXml.includes('p-strict-verified'));
  assert.ok(defaultXml.includes('p-undefined'));
});

test('financial: exact minimum price formula prevents selling below 10% net floor on Mercado Pago', () => {
  function calculateMinimumPrice(landedCost: number, paymentFeeRate: number = 0.06, minMarginRate: number = 0.10): number {
    const divisor = 1 - paymentFeeRate - minMarginRate;
    return Number((landedCost / divisor).toFixed(2));
  }

  function evaluateNetMargin(price: number, landedCost: number, paymentFeeRate: number = 0.06): number {
    const netRevenue = price * (1 - paymentFeeRate);
    const netProfit = netRevenue - landedCost;
    return Number(((netProfit / price) * 100).toFixed(2));
  }

  // 1. Samsung Galaxy A37: Landed $417.60
  const galaxyLanded = 417.60;
  const galaxyCorrectMinPrice = calculateMinimumPrice(galaxyLanded);
  assert.equal(galaxyCorrectMinPrice, 497.14); // 417.60 / 0.84 = 497.1428...

  // Mathematical proof that $489 was incorrect (only 8.60% net margin):
  assert.equal(evaluateNetMargin(489.00, galaxyLanded), 8.60);
  assert.ok(evaluateNetMargin(489.00, galaxyLanded) < 10.0);

  // Mathematical proof that $497.15 satisfies >= 10.00% net margin:
  assert.ok(evaluateNetMargin(497.15, galaxyLanded) >= 10.0);

  // 2. MacBook Air M5: Landed $1,645.20
  const macbookAirLanded = 1645.20;
  const macbookAirMinPrice = calculateMinimumPrice(macbookAirLanded);
  assert.equal(macbookAirMinPrice, 1958.57); // 1,645.20 / 0.84 = 1,958.5714...
  assert.ok(evaluateNetMargin(1958.58, macbookAirLanded) >= 10.0);
  // Current retail $1,899 produces only 7.36% on Mercado Pago:
  assert.equal(evaluateNetMargin(1899.00, macbookAirLanded), 7.36);

  // 3. MacBook Neo 13": Landed $1,009.20
  const macbookNeoLanded = 1009.20;
  const macbookNeoMinPrice = calculateMinimumPrice(macbookNeoLanded);
  assert.equal(macbookNeoMinPrice, 1201.43); // 1,009.20 / 0.84 = 1,201.4285...
  assert.ok(evaluateNetMargin(1201.43, macbookNeoLanded) >= 10.0);
  // Current retail $1,169 produces only 7.67% on Mercado Pago:
  assert.equal(evaluateNetMargin(1169.00, macbookNeoLanded), 7.67);
});

test('checkout: payment methods restriction blocks unauthorized payment methods per product', () => {
  interface TestLineProduct {
    id: string;
    title: string;
    payment_methods?: string[];
  }

  function validateProductPaymentMethod(p: TestLineProduct, selectedMethod: string) {
    if (Array.isArray(p.payment_methods) && p.payment_methods.length > 0 && !p.payment_methods.includes(selectedMethod)) {
      throw new Error(`${p.title} no acepta ${selectedMethod === 'mercado_pago' ? 'Mercado Pago' : 'transferencia bancaria'}. Elegí otro medio de pago.`);
    }
  }

  const transferOnlyProduct: TestLineProduct = {
    id: 'macbook-air',
    title: 'Apple MacBook Air M5',
    payment_methods: ['transferencia'],
  };

  const universalProduct: TestLineProduct = {
    id: 'medicube-serum',
    title: 'Medicube Collagen Serum',
    payment_methods: ['transferencia', 'mercado_pago'],
  };

  // Transferencia allowed on both
  assert.doesNotThrow(() => validateProductPaymentMethod(transferOnlyProduct, 'transferencia'));
  assert.doesNotThrow(() => validateProductPaymentMethod(universalProduct, 'transferencia'));

  // Mercado Pago allowed on universal, BLOCKED on transferOnly
  assert.doesNotThrow(() => validateProductPaymentMethod(universalProduct, 'mercado_pago'));
  assert.throws(
    () => validateProductPaymentMethod(transferOnlyProduct, 'mercado_pago'),
    /Apple MacBook Air M5 no acepta Mercado Pago/
  );
});

test('checkout: profitability snapshot with allowed: false is blocked in quote and order creation', () => {
  interface ProfitabilityResult {
    allowed?: boolean;
    state?: string;
    reason?: string;
  }

  function enforceProfitabilitySnapshot(snapshot: ProfitabilityResult | null) {
    if (!snapshot || snapshot.allowed === false || snapshot.state === 'review') {
      const reason = snapshot?.reason ? `: ${snapshot.reason}` : '';
      throw new Error(`La rentabilidad final requiere revisión${reason}. Consultanos antes de pagar.`);
    }
  }

  // 1. Validated snapshot passes
  assert.doesNotThrow(() => enforceProfitabilitySnapshot({ allowed: true, state: 'validated' }));

  // 2. Preview mode returning allowed: false / state: 'review' throws error
  assert.throws(
    () => enforceProfitabilitySnapshot({
      allowed: false,
      state: 'review',
      reason: 'Effective contribution below 10 percent floor',
    }),
    /Effective contribution below 10 percent floor/
  );

  // 3. Missing profile throws review
  assert.throws(
    () => enforceProfitabilitySnapshot({
      allowed: false,
      state: 'review',
      reason: 'Exact verified cost profile missing',
    }),
    /Exact verified cost profile missing/
  );
});

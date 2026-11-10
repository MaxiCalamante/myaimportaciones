import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { usdFixture } from './helpers/usd-fixture';

async function enforcementFixture() {
  const f = await usdFixture();
  await f.db.exec('reset role; create table if not exists product_supplier_preferences(product_id uuid, variant_id uuid, offer_id uuid)');
  for (const name of [
    '20261106213029_usd_contribution_policy.sql',
    '20261106213412_usd_profitability_integration.sql',
    '20261110190000_checkout_profitability_enforcement.sql',
  ]) {
    await f.db.exec(readFileSync('supabase/migrations/' + name, 'utf8'));
  }

  // Set up verified cost basis ($10 origin, 20% carrier => $12 landed cost)
  const b = {
    status: 'COSTO_VERIFICADO',
    settlementBasis: 'usd',
    settlementDocument: 'Pago documentado QA',
    document: 'Factura y gastos confirmados QA',
    costsComplete: true,
    identityVerified: true,
    accountingConfirmed: true,
    accountingBasis: 'gross_no_vat',
    currency: 'USD',
    origin: '10',
    unitsPerUsd: '1',
    fxSource: 'Factura USD QA',
    fxAt: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    components: [],
    carrier: {
      kind: 'percent',
      percent: '20',
      confirmed: true,
      document: 'Cotización pasador QA 20%',
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    },
  };
  await f.db.query('select save_store_profitability_profile_v2($1, null, $2, 0, \'Perfil base QA\')', [f.id, b]);

  // Set up standard policy with 10% floor, MP 6% fee, Transferencia 0%
  const mpMethod = {
    confirmed: true,
    rounding: 'exact',
    document: 'Tarifa MP QA 6%',
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    tiers: [{ minUsd: '0', maxUsd: null, percentGross: '6', percentNet: '6', fixedUsd: '0', fixedArs: '0' }],
  };
  const transferMethod = {
    confirmed: true,
    rounding: 'exact',
    document: 'Transferencia QA 0%',
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    tiers: [{ minUsd: '0', maxUsd: null, percentGross: '0', percentNet: '0', fixedUsd: '0', fixedArs: '0' }],
  };

  await f.db.query('select save_store_profitability_policy_v2($1, \'Política controlada 10% piso\')', [
    {
      retailTarget: '30',
      wholesaleTarget: '18',
      minimumMargin: '10',
      usdStep: '.01',
      costMaxAgeSeconds: 86400,
      methods: {
        transferencia: transferMethod,
        mercado_pago: mpMethod,
      },
    },
  ]);

  const check = async (payload = f.payload, rateId = f.rateId, snapshot: unknown = null) => {
    await f.db.exec('set role service_role');
    const res = await f.db.query<{ r: { allowed: boolean; state: string; reason?: string } }>(
      'select store_validate_profitability_v2($1, $2, $3) r',
      [payload, rateId, snapshot]
    );
    return res.rows[0].r;
  };

  const createQuote = async (payload = f.payload, rateId = f.rateId, customPrices?: unknown) => {
    await f.db.exec('set role service_role');
    const snapshot = await check(payload, rateId);
    const prices = customPrices ?? (await f.db.query<{ r: unknown }>('select store_checkout_prices_v1($1, $2, $3) r', [
      payload.items.map((i: { id: string; quantity: number; channel: string }) => ({ productId: i.id, quantity: i.quantity, channel: i.channel })),
      payload.payment,
      rateId,
    ])).rows[0].r;

    const q = (await f.db.query<{ id: string }>(
      'insert into store_checkout_quotes(fingerprint, rate_id, payload, prices, profitability_snapshot, expires_at) values(\'fingerprint\', $1, $2, $3, $4, now() + interval \'15 minutes\') returning id',
      [rateId, payload, prices, snapshot]
    )).rows[0].id;
    return { id: q, snapshot, prices };
  };

  return { ...f, b, check, createQuote, mpMethod, transferMethod };
}

test('SQL: create_store_order_v1 passes when margin > 10% in preview mode without bypass', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    assert.equal(q.snapshot.allowed, true);
    assert.equal(q.snapshot.state, 'validated');
    const order = await f.create(q.id);
    assert.ok(order.id);
    assert.equal(Number(order.total_amount), 58000);
  } finally {
    await f.db.close();
  }
});

test('SQL: create_store_order_v1 blocks order when margin < 10% even with enforcement = preview (BYPASS CLOSED)', async () => {
  const f = await enforcementFixture();
  try {
    // Set origin cost to $32 -> Landed = $32 * 1.2 = $38.40. Retail is $40.
    // Margin on transfer = (40 - 38.40) / 40 = 4% (< 10% floor!)
    const lowMarginBasis = { ...f.b, origin: '32' };
    await f.db.query('select save_store_profitability_profile_v2($1, null, $2, 1, \'Costo alto 4% margen\')', [f.id, lowMarginBasis]);

    // Validation returns allowed: false, state: 'review'
    const snapshot = await f.check();
    assert.equal(snapshot.allowed, false);
    assert.equal(snapshot.state, 'review');

    // Create quote with this snapshot
    const q = await f.createQuote();
    // Attempting to create the order MUST throw exception from create_store_order_v1
    await assert.rejects(
      f.create(q.id),
      /La rentabilidad del pedido no está autorizada/
    );

    // Verify 0 orders created
    const count = (await f.db.query<{ n: number }>('select count(*)::int n from orders')).rows[0].n;
    assert.equal(count, 0);
  } finally {
    await f.db.close();
  }
});

test('SQL: Mercado Pago 6% fee causes floor breach (< 10%) while Transferencia passes (> 10%) on same product', async () => {
  const f = await enforcementFixture();
  try {
    // Retail is $40. Landed cost: origin $30 * 1.2 = $36.00.
    // Transfer (0% fee): Net margin = (40 - 36) / 40 = 10% (exact floor!).
    // MP (6% fee): Net revenue = 40 * 0.94 = $37.60. Net margin = (37.60 - 36) / 40 = 4% (< 10% floor!).
    const borderBasis = { ...f.b, origin: '30' };
    await f.db.query('select save_store_profitability_profile_v2($1, null, $2, 1, \'Costo borde 10% en transferencia\')', [f.id, borderBasis]);

    // Allow both payment methods on the product for this test
    await f.db.exec('reset role');
    await f.db.query('update products set payment_methods = ARRAY[\'transferencia\'::payment_method, \'mercado_pago\'::payment_method] where id = $1', [f.id]);
    await f.db.exec('set role service_role');

    // 1. Transferencia quote -> passes
    const transferPayload = { ...f.payload, payment: 'transferencia' };
    const transferQuote = await f.createQuote(transferPayload);
    assert.equal(transferQuote.snapshot.allowed, true);
    assert.equal(transferQuote.snapshot.state, 'validated');
    const order = await f.create(transferQuote.id);
    assert.ok(order.id);

    // 2. Mercado Pago quote -> fails margin floor
    const mpPayload = { ...f.payload, payment: 'mercado_pago' };
    const mpCheck = await f.check(mpPayload);
    assert.equal(mpCheck.allowed, false);
    assert.equal(mpCheck.state, 'review');

    const mpQuote = await f.createQuote(mpPayload);
    const mpCustomer = { ...f.customer, request_id: randomUUID() };
    await assert.rejects(
      f.create(mpQuote.id, mpCustomer),
      /La rentabilidad del pedido no está autorizada/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: payment_methods column on products blocks unauthorized payment method', async () => {
  const f = await enforcementFixture();
  try {
    // Restrict product to transferencia only
    await f.db.exec('reset role');
    await f.db.query('update products set payment_methods = ARRAY[\'transferencia\'::payment_method] where id = $1', [f.id]);
    await f.db.exec('set role service_role');

    // Create quote attempting mercado_pago
    const mpPayload = { ...f.payload, payment: 'mercado_pago' };
    const q = await f.createQuote(mpPayload);

    // Must be rejected by create_store_order_v1
    await assert.rejects(
      f.create(q.id),
      /no permite el medio de pago mercado_pago/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: expired quote is rejected by create_store_order_v1', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    await f.db.exec('reset role');
    await f.db.query('update store_checkout_quotes set expires_at = now() - interval \'1 second\' where id = $1', [q.id]);
    await f.db.exec('set role service_role');

    await assert.rejects(
      f.create(q.id),
      /Cotización vencida o modificada/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: quote reuse (order_id already assigned) is rejected', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    const order1 = await f.create(q.id);
    assert.ok(order1.id);

    // Attempting to create a second order with the same quote id (with a different request_id)
    const newCustomer = { ...f.customer, request_id: randomUUID() };
    await assert.rejects(
      f.create(q.id, newCustomer),
      /Cotización vencida o modificada/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: identical retry with same request_id returns existing order (idempotency)', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    const order1 = await f.create(q.id);
    const order2 = await f.create(q.id);
    assert.equal(order1.id, order2.id);
  } finally {
    await f.db.close();
  }
});

test('SQL: obsolete USD price revision is rejected', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    // Simulate price revision bump in product_usd_prices
    await f.db.exec('reset role');
    await f.db.query('update product_usd_prices set revision = revision + 1 where product_id = $1', [f.id]);
    await f.db.exec('set role service_role');

    await assert.rejects(
      f.create(q.id),
      /El precio USD cambió/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: direct RPC call without service_role is rejected (Forbidden)', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();
    await f.db.exec('set role anon');
    await assert.rejects(
      f.db.query('select create_store_order_v1($1, \'fingerprint\', $2)', [q.id, f.customer]),
      /Forbidden|permission denied/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: set_store_profitability_enforcement_v1 controlled activation', async () => {
  const f = await enforcementFixture();
  try {
    // 1. Anon/authenticated cannot call it
    await f.db.exec('set role anon');
    await assert.rejects(
      f.db.query('select set_store_profitability_enforcement_v1(\'enforce\')'),
      /permission denied|Forbidden/
    );

    // 2. service_role can switch to enforce
    await f.db.exec('set role service_role');
    const res = await f.db.query<{ set_store_profitability_enforcement_v1: { enforcement: string } }>(
      'select set_store_profitability_enforcement_v1(\'enforce\')'
    );
    assert.equal(res.rows[0].set_store_profitability_enforcement_v1.enforcement, 'enforce');

    // 3. Invalid mode is rejected
    await assert.rejects(
      f.db.query('select set_store_profitability_enforcement_v1(\'invalid_mode\')'),
      /Modo inválido/
    );

    // 4. Can revert to preview safely
    const resPreview = await f.db.query<{ set_store_profitability_enforcement_v1: { enforcement: string } }>(
      'select set_store_profitability_enforcement_v1(\'preview\')'
    );
    assert.equal(resPreview.rows[0].set_store_profitability_enforcement_v1.enforcement, 'preview');
  } finally {
    await f.db.close();
  }
});

test('SQL: product/variant without verified cost profile is rejected', async () => {
  const f = await enforcementFixture();
  try {
    // Delete profile
    await f.db.exec('reset role; delete from store_profitability_profiles');
    await f.db.exec('set role service_role');
    const snapshot = await f.check();
    assert.equal(snapshot.allowed, false);
    assert.equal(snapshot.state, 'review');
    assert.match(snapshot.reason ?? '', /profile missing/);

    const q = await f.createQuote();
    await assert.rejects(
      f.create(q.id),
      /La rentabilidad del pedido no está autorizada/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: excessive discount reducing net margin below floor is rejected', async () => {
  const f = await enforcementFixture();
  try {
    // Retail $40, Landed $12.
    // Massive discount: ARS 50,000 on 58,000 retail -> paid ARS 8,000 (~$5.51 USD) < $12 cost -> negative margin!
    const discountedPayload = {
      ...f.payload,
      discount: 50000,
      total: 8000,
      discountAllocations: { [f.id + ':']: 50000 },
    };
    const snapshot = await f.check(discountedPayload);
    assert.equal(snapshot.allowed, false);
    assert.equal(snapshot.state, 'review');
    assert.match(snapshot.reason ?? '', /floor/);

    const q = await f.createQuote(discountedPayload);
    await assert.rejects(
      f.create(q.id),
      /La rentabilidad del pedido no está autorizada/
    );
  } finally {
    await f.db.close();
  }
});

test('SQL: supplier cost change between quote and confirmation triggers hash mismatch rejection', async () => {
  const f = await enforcementFixture();
  try {
    const q = await f.createQuote();

    // Now supplier cost basis changes in the database before order is created
    await f.db.exec('reset role');
    await f.db.query('update store_profitability_profiles set basis = jsonb_set(basis, \'{origin}\', \'"18"\'), revision = revision + 1 where product_id = $1', [f.id]);
    await f.db.exec('set role service_role');

    // Attempting to create order with the quote's outdated snapshot hash must be rejected
    await assert.rejects(
      f.create(q.id),
      /La rentabilidad del pedido no está autorizada: Cost changed since quote/
    );
  } finally {
    await f.db.close();
  }
});

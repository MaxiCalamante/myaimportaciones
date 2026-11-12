export type CheckoutPayment = 'transferencia' | 'mercado_pago';

/** A basket can use a method only when every product accepts it. */
export function checkoutPayments(products: ReadonlyArray<{paymentMethods?: readonly string[] | null}>, mercadoPagoEnabled: boolean): CheckoutPayment[] {
  if (!products.length) return [];
  return (['transferencia', 'mercado_pago'] as const).filter(method =>
    (method !== 'mercado_pago' || mercadoPagoEnabled)
    && products.every(product => (product.paymentMethods ?? ['transferencia']).includes(method)));
}

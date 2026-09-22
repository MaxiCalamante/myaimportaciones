export interface ProductCost {
  product_id: string; origin_cost: number; currency: string; exchange_rate: number;
  freight_per_unit: number; other_landed_cost: number; variable_cost: number;
  payment_fee_percent: number; minimum_contribution: number;
  expenses_confirmed: boolean; source_document?: string | null; source_page?: number | null;
}
export function calculateProductProfit(sale: number, cost: ProductCost | null | undefined) {
  if (!cost || Number(cost.origin_cost) <= 0) return null;
  const amounts = [sale, cost.origin_cost, cost.exchange_rate, cost.freight_per_unit, cost.other_landed_cost, cost.variable_cost, cost.payment_fee_percent].map(Number);
  if (amounts.some(n => !Number.isFinite(n) || n < 0) || sale <= 0 || Number(cost.exchange_rate) <= 0 || Number(cost.payment_fee_percent) >= 100) return null;
  const purchase = Number(cost.origin_cost) * Number(cost.exchange_rate);
  const landed = purchase + Number(cost.freight_per_unit) + Number(cost.other_landed_cost);
  const fees = sale * Number(cost.payment_fee_percent) / 100;
  const contribution = sale - landed - fees - Number(cost.variable_cost);
  return { purchase, landed, fees, contribution, margin: contribution / sale * 100, complete: cost.expenses_confirmed };
}

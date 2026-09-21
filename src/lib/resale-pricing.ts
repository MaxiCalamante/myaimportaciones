export interface ResaleInput { purchase: number; exchange: number; freight: number; other: number; variable: number; feePercent: number; minimum: number; ml: number; }
export function calculateResale(i: ResaleInput) {
  if (Object.values(i).some(n => !Number.isFinite(n) || n < 0) || i.purchase <= 0 || i.exchange <= 0 || i.feePercent >= 100) throw new Error("Revisá los costos y la comisión.");
  const landed = i.purchase * i.exchange + i.freight + i.other;
  const floor = Math.ceil((landed + i.variable + i.minimum) / (1 - i.feePercent / 100));
  const low = Math.floor(i.ml * .9), high = Math.floor(i.ml * .95);
  const suggested = i.ml > 0 && high >= floor ? Math.max(low, floor) : null;
  return { landed, floor, low, high, suggested, contribution: suggested === null ? null : suggested * (1 - i.feePercent / 100) - landed - i.variable };
}

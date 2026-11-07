/** Decimal arithmetic: inputs are decimal strings, calculations use integers. */
const TEN = BigInt(10), ZERO = BigInt(0);
export function decimalUnits(value: string | number, scale = 6): bigint {
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text) || text.length > 40) throw Error('Importe decimal inválido.');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) throw Error('Demasiados decimales.');
  const result = BigInt(whole) * TEN ** BigInt(scale) + BigInt(fraction.slice(0, scale).padEnd(scale, '0'));
  if (result > BigInt('1000000000000000000')) throw Error('Importe fuera de rango.');
  return result;
}
export function decimalString(units: bigint, scale = 2): string {
  if (units < ZERO) throw Error('Importe negativo.');
  const text = units.toString().padStart(scale + 1, '0');
  return scale ? `${text.slice(0, -scale)}.${text.slice(-scale)}` : text;
}
export function usdToArs(usd: string | number, rate: string | number, step: string | number = '0.01'): number {
  const u = decimalUnits(usd), r = decimalUnits(rate), s = decimalUnits(step, 2);
  if (r <= ZERO || s <= ZERO) throw Error('Falta una cotización o redondeo válido.');
  // Half-up to the configured ARS step, exactly once per unit.
  const denominator = BigInt('10000000000') * s;
  const cents = ((u * r + denominator / BigInt(2)) / denominator) * s;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Importe fuera de rango.');
  return Number(cents) / 100;
}
export const moneyCents = (value: string | number) => {
  const cents = decimalUnits(value, 2);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Importe fuera de rango.');
  return Number(cents);
};
/** Round a cost percentage upward to a cent, so fees are never understated. */
export function moneyPercent(value:string|number,percent:string|number):number {
 const numerator=decimalUnits(value)*decimalUnits(percent);
 const denominator=BigInt('1000000000000');
 return Number((numerator+denominator-BigInt(1))/denominator)/100;
}
export function arsToUsd(value:string|number,rate:string|number):string {
 const amount=decimalUnits(value),fx=decimalUnits(rate);
 if(fx<=BigInt(0))throw Error('Cotización inválida.');
 return decimalString((amount*BigInt(1000000)+fx/BigInt(2))/fx,6);
}
export const formatUsd = (value: string | number) => `USD ${new Intl.NumberFormat('es-AR', {minimumFractionDigits:2, maximumFractionDigits:6}).format(Number(value))}`;

/** Exact display total; unit prices remain the checkout rounding basis. */
export function multiplyUsd(value:string,quantity:number):string{
 if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Error("Cantidad inválida.");
 return decimalString(decimalUnits(value)*BigInt(quantity),6);
}

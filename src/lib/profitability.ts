/** Private engine contract. Monetary math lives only in store_profitability_v2. */
export const COST_STATUSES=['COSTO_VERIFICADO','COSTO_ESTIMADO','COSTO_DESACTUALIZADO','COSTO_INCOMPLETO','SIN_COSTO','REVISION_MANUAL']as const;
export type CostStatus=typeof COST_STATUSES[number];
export interface ProfitabilityResult{
 targetMargin:string;minimumMargin:string;automaticTotalUsd:string;minimumTotalUsd:string;
 acquisitionAndSaleCostUsd:string;effectiveMargin:string|null;feesUsd:string|null;
 contributionUsd:string|null;allowed:boolean;effectivePaidArs:string;quantity:number;
}
export interface ProfitabilityProfile{product_id:string;variant_id:string|null;revision:number;basis:Record<string,unknown>}
export interface ProfitabilityWorkspace{policy:{retail_target:string;wholesale_target:string;minimum_margin:string;usd_step:string;cost_max_age_seconds:number;enforcement:'preview'|'enforce';methods:Record<string,unknown>};profiles:ProfitabilityProfile[]}

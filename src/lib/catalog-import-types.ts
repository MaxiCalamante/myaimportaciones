import type { CatalogPricingRule } from './catalog-pricing';
export interface CatalogImportFilters {
  query?: string; supplierId?: string; brand?: string;
  availability?: 'in_stock'|'out_of_stock'|'unknown'; minCost?: number; maxCost?: number;
  page?: number; pageSize?: number;
}
export interface CatalogCandidate {
  id:string; title:string; brand:string; supplierName:string; originCost:number|null; currency:string|null;
  availability:string; checkedAt:string|null; linkedProductId:string|null; verification:string;
  price:number|null; margin:number|null; warnings:string[];
}
export interface CatalogImportJob {
 id:string;state:string;created_at:string;config:Record<string,unknown>;
 counts:Record<string,number>;
}
export interface CatalogImportItem { id:string;offer_id:string;state:string;product_id:string|null;error:string|null;attempts:number;payload:{action:string;reason?:string;target?:{productId:string};product?:{title:string;retail_price:number}} }
export interface CatalogImportWorkspace {
 installed:boolean; candidates:CatalogCandidate[];total:number;page:number;pageSize:number;
 suppliers:{id:string;name:string}[];categories:{id:string;name:string}[];
 jobs:CatalogImportJob[];pricing:CatalogPricingRule|null;
}
export interface CatalogPreviewSelection { filters:CatalogImportFilters;offerIds?:string[];allMatching:boolean;categoryId:string;limit:number }
export interface CatalogPreviewResult {jobId:string;total:number;counts:Record<string,number>;items:CatalogImportItem[]}
export interface CatalogReview {product_id:string;state:string;identity_confirmed:boolean;costs_confirmed:boolean;media_authorized:boolean;compliance_confirmed:boolean;evidence:string;title?:string;slug?:string}

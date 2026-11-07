import{atacadoUsaAdapter}from'./atacado-usa';import{starCompanyAdapter}from'./star-company';import{totalAdapter}from'./total';import{atacadoConnectAdapter}from'./atacado-connect';
import type{SupplierAdapter,SupplierKey}from'./shared';
export * from './shared';
export const supplierAdapters:Record<SupplierKey,SupplierAdapter>={'atacado-usa':atacadoUsaAdapter,'star-company':starCompanyAdapter,total:totalAdapter,'atacado-connect':atacadoConnectAdapter};
export function supplierAdapter(key:string):SupplierAdapter{const adapter=supplierAdapters[key as SupplierKey];if(!adapter)throw Error('Proveedor fuera de los cuatro autorizados.');return adapter;}

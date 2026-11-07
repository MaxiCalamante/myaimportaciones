import{sourceUrl,supplierKeyForUrl}from'./supplier-url-policy';
import{fetchTrackerResponse}from'./supplier-tracker/network';
export{readSupplierHtml}from'./supplier-response';
export function supplierUrl(value:string){return sourceUrl(value,value,supplierKeyForUrl(value));}
export async function fetchSupplierPage(value:string,_userAgent:string):Promise<Response>{
 void _userAgent; // Caller labels cannot bypass the shared public HTTP policy.
 return(await fetchTrackerResponse(value,supplierKeyForUrl(value))).response;
}

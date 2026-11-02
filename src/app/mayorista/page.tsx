import {WholesaleLanding} from "@/components/wholesale/wholesale-experience";
import {wholesaleMetadata} from "@/lib/wholesale-content";
import type {WholesaleFilters} from "@/components/wholesale/wholesale-catalog-grid";
export async function generateMetadata({searchParams}:{searchParams:Promise<WholesaleFilters>}){
 const params=await searchParams;
 return{...wholesaleMetadata(),robots:{index:!Object.values(params).some(Boolean),follow:true}};
}
export default async function WholesalePage({searchParams}:{searchParams:Promise<WholesaleFilters>}){
 return <WholesaleLanding filters={await searchParams}/>;
}

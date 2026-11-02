import {getCurrentProfile} from "@/lib/auth";
import {WholesaleQuotePrintable} from "@/components/wholesale/wholesale-quote-printable";
import {randomUUID} from "node:crypto";
import {wholesaleQuoteHeader} from "@/lib/wholesale-quote-header";
export const metadata={title:"Mi selección mayorista | MYA",robots:{index:false,follow:false}};
export default async function WholesaleQuotePage(){
 const auth=await getCurrentProfile();
 return <WholesaleQuotePrintable profile={auth.profile} header={wholesaleQuoteHeader(new Date(),randomUUID())}/>;
}

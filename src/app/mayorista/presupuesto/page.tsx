import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { WholesaleQuotePrintable } from "@/components/wholesale/wholesale-quote-printable";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { wholesaleQuoteHeader } from "@/lib/wholesale-quote-header";

export const metadata = {
  title: "Presupuesto Mayorista B2B | MYA Importaciones",
  robots: { index: false, follow: false },
};

export default async function WholesaleQuotePage() {
  const auth = await getCurrentProfile();
  if (!auth.user) redirect("/login?next=/mayorista/presupuesto");
  if (!auth.profile?.isApprovedWholesale) redirect("/mayorista");
  const { products } = await getStorefrontData({ wholesale: true, all: true });

  const wholesaleProducts = products.filter(
    (p) => p.wholesalePrice > 0 || p.wholesaleOnly
  );

  return (
    <WholesaleQuotePrintable
      profile={auth.profile}
      catalogProducts={wholesaleProducts}
      header={wholesaleQuoteHeader(new Date(), randomUUID())}
    />
  );
}

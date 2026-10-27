import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { WholesaleQuotePrintable } from "@/components/wholesale/wholesale-quote-printable";

export const metadata = {
  title: "Presupuesto Mayorista B2B | MYA Importaciones",
  robots: { index: false, follow: false },
};

export default async function WholesaleQuotePage() {
  const [auth, { products }] = await Promise.all([
    getCurrentProfile(),
    getStorefrontData({ wholesale: true, all: true }),
  ]);

  const wholesaleProducts = products.filter(
    (p) => p.wholesalePrice > 0 || p.wholesaleOnly
  );

  return (
    <WholesaleQuotePrintable
      profile={auth.profile}
      catalogProducts={wholesaleProducts}
    />
  );
}

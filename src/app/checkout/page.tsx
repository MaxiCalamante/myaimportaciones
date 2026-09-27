import { hasCommerceService } from "@/lib/supabase/service";
import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { getCurrentProfile } from "@/lib/auth";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Finalizar compra",
  description: "Completá tu pedido minorista con entrega y condiciones confirmadas.",
};

export default async function CheckoutPage() {
  const auth = await getCurrentProfile();

  // Permite tanto compras de invitados como de usuarios autenticados sin fricción
  return <CheckoutPanel profile={auth.profile} checkoutEnabled={hasCommerceService() && process.env.COMMERCE_CHECKOUT_ENABLED === "true"} mercadoPagoEnabled={isMercadoPagoConfigured()} />;
}

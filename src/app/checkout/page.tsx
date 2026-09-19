import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = {
  title: "Finalizar Compra | MYA Importaciones",
  description: "Completá tu pedido minorista o mayorista con envío a todo el país y descuento por transferencia.",
};

export default async function CheckoutPage() {
  const auth = await getCurrentProfile();

  // Permite tanto compras de invitados como de usuarios autenticados sin fricción
  return <CheckoutPanel profile={auth.profile} />;
}

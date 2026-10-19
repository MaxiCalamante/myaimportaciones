import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { RecoverCart } from "@/components/commerce/recover-cart";
export const metadata = { title: "Recuperar mi carrito | MYA", robots: { index: false, follow: false } };
export default async function RecoverCartPage() {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/recuperar-carrito");
  return <main className="mx-auto max-w-xl px-4 py-12"><RecoverCart /></main>;
}

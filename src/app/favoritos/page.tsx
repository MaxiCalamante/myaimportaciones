import { FavoritesList } from "@/components/commerce/favorites-list";
export const metadata = { title: "Mis favoritos", robots: { index: false, follow: false } };
export default function FavoritesPage() {
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold">Mis favoritos</h1><p>Guardá productos para verlos después. Al ingresar, se sincronizan con tu cuenta.</p><FavoritesList /></div>;
}

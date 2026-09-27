import { FavoritesList } from "@/components/commerce/favorites-list";
export const metadata = { title: "Mis favoritos", robots: { index: false, follow: false } };
export default function FavoritesPage() {
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8"><div className="mb-7 rounded-3xl bg-gradient-to-br from-sky-800 to-cyan-600 p-6 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-widest text-sky-100">Tu selección</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Mis favoritos</h1><p className="mt-3 max-w-xl text-sm leading-6 text-sky-50">Guardá los productos que te interesan y volvé a ellos cuando quieras. Si ingresás a tu cuenta, tus favoritos se sincronizan.</p></div><FavoritesList /></div>;
}

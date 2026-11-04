import { notFound } from "next/navigation";
import { WholesaleLanding } from "@/components/wholesale/wholesale-landing";
import { findWholesaleCategory, normalizeWholesaleFilters, wholesaleMetadata, WHOLESALE_CATEGORIES } from "@/lib/wholesale-content";

export function generateStaticParams() {
  return WHOLESALE_CATEGORIES.map(category => ({ rubro: category.slug }));
}

type Props = {
  params: Promise<{ rubro: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const category = findWholesaleCategory((await params).rubro);
  if (!category) notFound();
  return wholesaleMetadata(category, normalizeWholesaleFilters(await searchParams));
}

export default async function WholesaleCategoryPage({ params, searchParams }: Props) {
  const category = findWholesaleCategory((await params).rubro);
  if (!category) notFound();
  return <WholesaleLanding category={category} filters={normalizeWholesaleFilters(await searchParams)} />;
}

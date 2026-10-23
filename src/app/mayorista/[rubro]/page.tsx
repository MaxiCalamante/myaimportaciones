import { notFound } from "next/navigation";
import { WholesaleLanding } from "@/components/wholesale/wholesale-landing";
import { findWholesaleCategory, wholesaleMetadata, WHOLESALE_CATEGORIES } from "@/lib/wholesale-content";

export function generateStaticParams() {
  return WHOLESALE_CATEGORIES.map(category => ({ rubro: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ rubro: string }> }) {
  const category = findWholesaleCategory((await params).rubro);
  if (!category) notFound();
  return wholesaleMetadata(category);
}

export default async function WholesaleCategoryPage({ params }: { params: Promise<{ rubro: string }> }) {
  const category = findWholesaleCategory((await params).rubro);
  if (!category) notFound();
  return <WholesaleLanding category={category} />;
}

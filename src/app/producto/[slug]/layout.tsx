import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront";

export default async function ProductLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Validate above the loading boundary so missing products return HTTP 404.
  if (!await getProductBySlug(slug)) notFound();
  return children;
}

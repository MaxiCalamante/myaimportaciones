"use client";

import { useState, useMemo } from "react";
import { ProductGallery } from "./product-gallery";
import { ProductDetailInteractive } from "./product-detail-interactive";
import type { Product, ProductVariant } from "@/lib/types";

export function ProductShowcase({
  product,
  beforeInteractive,
  afterInteractive,
}: {
  product: Product;
  beforeInteractive: React.ReactNode;
  afterInteractive?: React.ReactNode;
}) {
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);

  const displayImage = activeVariant?.imageUrl || product.imageUrl;

  // Include all variant images in the gallery so user can browse all visual options
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.imageUrl) list.push(product.imageUrl);
    if (product.imageUrls) list.push(...product.imageUrls);
    if (product.variants) {
      for (const v of product.variants) {
        if (v.imageUrl) list.push(v.imageUrl);
      }
    }
    return [...new Set(list.filter(Boolean))];
  }, [product]);

  return (
    <div className="grid min-w-0 gap-6 sm:gap-10 lg:grid-cols-2 lg:items-start">
      {/* Left Column: Image Gallery (Sticky on desktop) */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          title={product.title}
          image={displayImage}
          images={galleryImages}
        />
      </div>

      {/* Right Column: Info & Actions */}
      <div className="flex min-w-0 flex-col justify-center space-y-4 sm:space-y-6">
        {beforeInteractive}

        <ProductDetailInteractive
          product={product}
          onVariantChange={setActiveVariant}
        />
        {afterInteractive}
      </div>
    </div>
  );
}

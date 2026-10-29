"use client";

import { useState, useMemo } from "react";
import { ProductGallery } from "./product-gallery";
import { ProductDetailInteractive } from "./product-detail-interactive";
import type { Product, ProductVariant } from "@/lib/types";

export function ProductShowcase({
  product,
  beforeInteractive,
  afterInteractive,
  initialVariantId,
}: {
  product: Product;
  beforeInteractive: React.ReactNode;
  afterInteractive?: React.ReactNode;
  initialVariantId?: string;
}) {
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(() => product.variants?.find(variant => variant.isActive && variant.id === initialVariantId) || null);

  const displayImage = activeVariant?.imageUrl || product.imageUrl;

  // Include all variant images in the gallery so user can browse all visual options
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.imageUrl) list.push(product.imageUrl);
    if (product.imageUrls) list.push(...product.imageUrls);
    if (product.variants) {
      for (const v of product.variants) {
        if (v.isActive && v.imageUrl) list.push(v.imageUrl);
      }
    }
    return [...new Set(list.filter(Boolean))];
  }, [product]);

  return (
    <div className="min-w-0 space-y-8 sm:space-y-12">
    <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
      {/* Left Column: Image Gallery (Sticky on desktop) */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
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
          initialVariantId={initialVariantId}
          onVariantChange={setActiveVariant}
        />
      </div>
    </div>
      {afterInteractive}
    </div>
  );
}

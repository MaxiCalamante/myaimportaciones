"use client";

import { useState } from "react";
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

  return (
    <div className="grid gap-6 sm:gap-10 lg:grid-cols-2 lg:items-start">
      {/* Left Column: Image Gallery (Sticky on desktop) */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          title={product.title}
          image={displayImage}
          images={product.imageUrls}
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

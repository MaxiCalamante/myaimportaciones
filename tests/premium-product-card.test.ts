import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCard } from "../src/components/commerce/product-card";
import { CommerceProvider } from "../src/components/commerce/commerce-provider";
import type { Product, ProductChannel, ProductVariant } from "../src/lib/types";

const product: Product = {
  id: "card-product", slug: "equipo-prueba", title: "Equipo de prueba con nombre extenso", brand: "MYA",
  description: "", categoryId: "category", categoryName: "Electrónica", imageUrl: "/placeholder-product.svg",
  retailPrice: 125000, wholesalePrice: 110000, wholesaleMinQuantity: 4, stock: 3,
  stockVerifiedAt: "2026-11-01T00:00:00Z", fulfillmentMode: "own_stock", paymentMethods: ["transferencia"],
  tags: [], featured: false, wholesaleOnly: false,
};
const variant = (id: string, overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id, productId: product.id, title: `Versión ${id}`, options: { Color: id }, retailPrice: 125000,
  stock: 0, fulfillmentMode: "supplier", supplierAvailable: true, isActive: true, displayOrder: 0, ...overrides,
});
const renderCard = (overrides: Partial<Product> = {}, channel: ProductChannel = "retail") => renderToStaticMarkup(
  createElement(CommerceProvider, null, createElement(ProductCard, { product: { ...product, ...overrides }, channel })),
);

test("variant card leads to product selection and never adds an arbitrary variant", () => {
  const html = renderCard({ hasVariants: true, variants: [variant("Azul"), variant("Negro")], minPrice: 125000, maxPrice: 180000 });
  assert.match(html, /2 opciones disponibles/);
  assert.match(html, /href="\/producto\/equipo-prueba"[^>]*>[^]*?Elegir opciones/);
  assert.match(html, /Desde/);
  assert.match(html, /\$\s*125\.000/);
  assert.doesNotMatch(html, /Agregar al carrito|Ver versión|\?variant=/);
  assert.match(html, /aria-label="Agregar a favoritos"[^>]*aria-pressed="false"/);
});

test("own stock and supplier availability remain visibly distinct", () => {
  assert.match(renderCard(), /Stock en Tandil/);
  const supplier = renderCard({ fulfillmentMode: "supplier", supplierAvailable: true });
  assert.match(supplier, /Bajo pedido/);
  assert.match(supplier, /Agregar al carrito/);
  assert.doesNotMatch(supplier, /Stock en Tandil/);
  const unavailable = renderCard({ stock: 100, stockVerifiedAt: null });
  assert.match(unavailable, /Disponibilidad a confirmar/);
  assert.match(unavailable, /Ver disponibilidad/);
  assert.doesNotMatch(unavailable, /Agregar al carrito|Stock en Tandil/);
});

test("variant availability comes from active rows and never turns supplier units into own stock", () => {
  const underOrder = renderCard({ hasVariants: true, variants: [variant("Azul"), variant("Negro", { fulfillmentMode: "own_stock", stock: 5, stockVerifiedAt: "2026-11-01", isActive: false })] });
  assert.match(underOrder, /Bajo pedido/);
  assert.doesNotMatch(underOrder, /Stock en Tandil/);
  const noAvailableOptions = renderCard({ hasVariants: true, variants: [variant("Azul", { supplierAvailable: false })] });
  assert.match(noAvailableOptions, /Disponibilidad a confirmar/);
  const mixed = renderCard({ hasVariants: true, variants: [variant("Azul"), variant("Negro", { fulfillmentMode: "own_stock", stock: 1, stockVerifiedAt: "2026-11-01" })] });
  assert.match(mixed, /Stock según opción/);
});

test("card keeps channel pricing, verified currency equivalent and real promotions", () => {
  const retail = renderCard({ tags: ["oferta"], specifications: { "Cotización USD/ARS": "1250" } });
  assert.match(retail, /Oferta/);
  assert.match(retail, /USD 100,00/);
  assert.doesNotMatch(retail, /<del\b|% OFF/);
  const wholesale = renderCard({ hasVariants: true, minPrice: 90000, maxPrice: 180000 }, "wholesale");
  assert.match(wholesale, /\$\s*110\.000/);
  assert.match(wholesale, /Mínimo 4 unidades/);
  assert.doesNotMatch(wholesale, /Desde|USD/);
});

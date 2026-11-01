import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { CommerceProvider } from "../src/components/commerce/commerce-provider";
import { CategoryNavigation } from "../src/components/layout/category-navigation";
import { MobileBottomNav } from "../src/components/layout/mobile-bottom-nav";
import { SiteHeader } from "../src/components/layout/site-header";
import type { Category } from "../src/lib/types";
import type { Profile } from "../src/lib/auth";

const category = (id: string, name: string, parentId: string | null = null): Category => ({
  id, name, parentId, slug: id, description: "", imageUrl: "", wholesaleOnly: false, displayOrder: 0,
});
const categories = [category("perfumes", "Perfumes"), category("arabe", "Perfumes árabes", "perfumes"), category("herramientas", "Herramientas")];
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "navigation-test" };
function render(node: ReactNode, pathname = "/") {
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router },
    createElement(PathnameContext.Provider, { value: pathname }, createElement(CommerceProvider, null, node))));
}

test("mobile categories offer direct navigation for a category without subcategories", () => {
  const html = render(createElement(CategoryNavigation, { categories, catalogPath: "/catalogo", onNavigate() {}, mobile: true }));
  assert.match(html, /<a[^>]+href="\/catalogo\?category=herramientas"[^>]*>.*?Herramientas<\/span>/);
  assert.equal((html.match(/<details\b/g) ?? []).length, 1, "only categories with real children need an accordion");
  assert.match(html, /<summary[^>]*>.*?Perfumes<\/span>/);
  assert.match(html, /href="\/catalogo\?category=arabe"/);
});

test("mobile category navigation preserves the configured channel and encoded category slug", () => {
  const html = render(createElement(CategoryNavigation, { categories: [category("piel sensible", "Piel sensible")], catalogPath: "/mayorista", onNavigate() {}, mobile: true }));
  assert.match(html, /href="\/mayorista\?category=piel%20sensible"/);
  assert.doesNotMatch(html, /href="\/catalogo/);
});

test("signed-out customers still see the five consistent bottom navigation choices", () => {
  const html = render(createElement(MobileBottomNav, { signedIn: false }), "/seguimiento");
  for (const label of ["Inicio", "Catálogo", "Carrito", "Mis pedidos", "WhatsApp"]) assert.ok(html.includes(`>${label}</span>`), label);
  assert.match(html, /<a\b(?=[^>]*href="\/seguimiento")(?=[^>]*aria-current="page")[^>]*>/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 3);
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
});

test("bottom navigation keeps signed-in account links and stays out of the purchase tunnel", () => {
  assert.match(render(createElement(MobileBottomNav, { signedIn: true }), "/cuenta"), /<a\b(?=[^>]*href="\/cuenta")(?=[^>]*aria-current="page")[^>]*>/);
  for (const path of ["/checkout", "/producto/real-product", "/admin"]) {
    assert.equal(render(createElement(MobileBottomNav, { signedIn: false }), path), "");
  }
});

test("catalog nested routes retain the active bottom navigation state", () => {
  const html = render(createElement(MobileBottomNav, { signedIn: false }), "/catalogo/categoria");
  assert.match(html, /<a\b(?=[^>]*href="\/catalogo")(?=[^>]*aria-current="page")[^>]*>/);
});

test("header administration is rendered only for the server-provided admin role", () => {
  const customer: Profile = { id: "customer", fullName: "Cliente", email: "cliente@example.test", role: "customer", customerTier: "retail" };
  for (const profile of [null, customer]) {
    assert.doesNotMatch(render(createElement(SiteHeader, { initialCategories: categories, profile })), /href="\/admin"/);
  }
  assert.match(render(createElement(SiteHeader, { initialCategories: categories, profile: { ...customer, role: "admin" } })), /href="\/admin"/);
});

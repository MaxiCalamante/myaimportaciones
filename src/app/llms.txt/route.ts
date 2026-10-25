import { publicUrl } from "@/lib/seo";
import { WHOLESALE_CATEGORIES } from "@/lib/wholesale-content";
import { WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";
import { whatsappContacts, getContactWhatsAppUrl } from "@/lib/site";

export const dynamic = "force-static";

/** Optional public directory. The linked HTML pages remain the commercial source of truth. */
export function GET() {
  const text = `# MYA Importaciones

> Tienda de productos importados en Tandil, Buenos Aires, Argentina. Venta minorista y mayorista con envíos a toda Argentina.

## Compras y entrega

- Minorista: compra desde una unidad. Las fichas y el catálogo público muestran precios minoristas en pesos argentinos.
- Mayorista: todo el catálogo se puede consultar por mayor: cosmética coreana y skincare, perfumería, cuidado capilar, electrónica y tecnología, herramientas y equipamiento.
- Mínimo mayorista: ${WHOLESALE_MINIMUM_DETAILS}
- Precios mayoristas: cotización privada por WhatsApp con Máximo o Agustina. No se publica una lista de precios mayoristas.
- Medicube es una de las marcas de cosmética coreana del catálogo; la venta mayorista también abarca otras marcas y todos los rubros publicados.
- Envíos a todas las provincias de Argentina. El costo y plazo se confirman según productos, ciudad y código postal.
- La disponibilidad se consulta por producto y cantidad. Una consulta no reserva unidades ni acredita un pago.

## Páginas principales

- [Tienda MYA Importaciones](${publicUrl("/")}): marcas, rubros y atención.
- [Catálogo minorista](${publicUrl("/catalogo")}): productos, presentaciones y precios públicos.
- [Venta mayorista](${publicUrl("/mayorista")}): condiciones, mínimo y consultas.
${WHOLESALE_CATEGORIES.map(category => `- [${category.title}](${publicUrl(`/mayorista/${category.slug}`)}): ${category.description}`).join("\n")}
- [Medicube minorista](${publicUrl("/catalogo?brand=Medicube")}): catálogo de la marca con precios minoristas.
- [Condiciones de compra y entrega](${publicUrl("/condiciones")}).
- [Política de privacidad](${publicUrl("/privacidad")}).
- [Sitemap](${publicUrl("/sitemap.xml")}): URLs públicas de productos, categorías, marcas y mayorista.

## Contactos comerciales

${whatsappContacts.map(contact => `- ${contact.name}: ${contact.phone}. [WhatsApp](${getContactWhatsAppUrl(contact.id, "Hola MYA Importaciones. Quisiera hacer una consulta.")}). Atención minorista y mayorista.`).join("\n")}

## Alcance de esta información

Este directorio resume información pública. Para precios minoristas y presentaciones, consultá la ficha vigente. Para precios mayoristas, cantidades y entrega, pedí una cotización por WhatsApp. Comprar por mayor no implica representación oficial de una marca.
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

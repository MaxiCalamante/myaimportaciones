import { pageMetadata } from "@/lib/seo";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import { isShippingPaidSeparately } from "@/lib/shipping";
import Link from "next/link";
import { WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";
export const metadata = pageMetadata({ title: "Condiciones de compra", description: "Consultá precios, pagos, entrega, arrepentimiento y garantías de tus compras en MYA Importaciones.", path: "/condiciones" });
export default function Conditions() { return <article className="content-page max-w-3xl space-y-5 px-5 py-10">
  <h1 className="text-3xl font-bold">Condiciones de compra</h1>
  <h2 className="text-xl font-bold">Quién vende</h2>
  <p>MYA Importaciones, Tandil, Buenos Aires. Atención por WhatsApp: <a className="underline" href={getWhatsAppUrl("Hola Máximo, quiero consultar sobre mi compra.")}>Máximo ({siteConfig.phone})</a> o <a className="underline" href={getWhatsAppUrl("Hola Agustina, quiero consultar sobre mi compra.", siteConfig.whatsappNumberAgustina)}>Agustina ({siteConfig.phoneAgustina})</a>. También podés contactarnos por <a className="underline" href={siteConfig.instagram}>Instagram {siteConfig.instagramHandle}</a>.</p>
  <p>Razón social: {process.env.NEXT_PUBLIC_BUSINESS_NAME || "pendiente de publicación"}. CUIT: {siteConfig.bankTransfer.cuit || "pendiente de publicación"}. Domicilio comercial: {process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "pendiente de publicación"}.</p>
  <h2 className="text-xl font-bold">Precios, disponibilidad y pagos</h2>
  <p>La tienda ofrece venta minorista en pesos argentinos. El resumen final informa productos, descuentos aplicables y entrega antes de confirmar. Las promociones no se acumulan. Los productos sin disponibilidad verificada requieren consulta previa. Crear un pedido no acredita un pago: la confirmación depende del cobro verificado.</p>
  <h2 className="text-xl font-bold" id="mayoristas">Compras mayoristas</h2>
  <p>{WHOLESALE_MINIMUM_DETAILS} El catálogo mayorista muestra precios confirmados por unidad y los importes que requieren revisión. No se necesita aprobación comercial ni CUIT para explorar productos o armar un pedido. El servidor revalida precio, mínimo y disponibilidad antes de habilitar un pago. Las selecciones con datos pendientes se registran para confirmación, sin cobro definitivo.</p>
  <p><Link className="underline" href="/mayorista">Explorá el catálogo público y armá tu pedido mayorista</Link>. Podés consultar el surtido antes de comprar; una consulta no reserva stock ni registra un pedido.</p>
  <h2 className="text-xl font-bold">Entrega</h2>
  <p>{isShippingPaidSeparately() ? "Enviamos a domicilio a todo el país. El pago online corresponde a los productos; el costo del envío no está incluido y se cotiza y abona por separado. MYA se contactará con el cliente para coordinar transporte, costo y plazo antes del despacho." : "El retiro en Tandil se coordina previamente. Para envíos, se debe confirmar destino, peso, volumen, costo y plazo antes de pagar."} No se garantiza entrega inmediata ni envío gratuito general.</p>
  <h2 className="text-xl font-bold">Arrepentimiento y reclamos</h2>
  <p>Podés solicitar el arrepentimiento de una compra a distancia dentro de los diez días corridos desde la entrega o la celebración del contrato, lo que ocurra después, conforme a la normativa aplicable. No necesitás una cuenta ni explicar el motivo. Coordinaremos la devolución según corresponda.</p>
  <p>Para fallas, errores de entrega o garantías, contactanos con el detalle del producto y la compra. Se respetan los derechos y garantías legales aplicables. Cualquier garantía comercial adicional debe constar expresamente en la ficha; no se presume garantía oficial de una marca.</p>
  <p className="text-sm">Referencia: <a className="underline" href="https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto">Disposición 954/2025</a>.</p>
 </article>; }

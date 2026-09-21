import Link from "next/link";
import { siteConfig } from "@/lib/site";
export const metadata = { title: "Condiciones de compra" };
export default function Conditions() { return <article className="mx-auto max-w-3xl space-y-5 px-5 py-10">
  <h1 className="text-3xl font-bold">Condiciones de compra</h1>
  <h2 className="text-xl font-bold">Quién vende</h2>
  <p>MYA Importaciones, Tandil, Buenos Aires. Contacto: <a className="underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
  <p>Razón social: {process.env.NEXT_PUBLIC_BUSINESS_NAME || "pendiente de publicación"}. CUIT: {siteConfig.bankTransfer.cuit || "pendiente de publicación"}. Domicilio comercial: {process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "pendiente de publicación"}.</p>
  <h2 className="text-xl font-bold">Precios, disponibilidad y pagos</h2>
  <p>La tienda ofrece venta minorista en pesos argentinos. El resumen final informa productos, descuentos aplicables y entrega antes de confirmar. Las promociones no se acumulan. Los productos sin disponibilidad verificada requieren consulta previa. Crear un pedido no acredita un pago: la confirmación depende del cobro verificado.</p>
  <h2 className="text-xl font-bold">Entrega</h2>
  <p>El retiro en Tandil se coordina previamente. Para envíos, se debe confirmar destino, peso, volumen, costo y plazo antes de pagar. No se garantiza entrega inmediata ni envío gratuito general.</p>
  <h2 className="text-xl font-bold">Arrepentimiento y reclamos</h2>
  <p>Podés solicitar el arrepentimiento de una compra a distancia dentro de los diez días corridos desde la entrega o la celebración del contrato, lo que ocurra después, conforme a la normativa aplicable. No necesitás una cuenta ni explicar el motivo. Coordinaremos la devolución según corresponda.</p>
  <Link className="inline-block rounded-xl bg-zinc-950 px-5 py-3 text-white" href="/arrepentimiento">Botón de arrepentimiento</Link>
  <p>Para fallas, errores de entrega o garantías, contactanos con el detalle del producto y la compra. Se respetan los derechos y garantías legales aplicables. Cualquier garantía comercial adicional debe constar expresamente en la ficha; no se presume garantía oficial de una marca.</p>
  <p className="text-sm">Referencia: <a className="underline" href="https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto">Disposición 954/2025</a>.</p>
 </article>; }

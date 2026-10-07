const configuredAppUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://myaimportaciones.vercel.app").replace(/\/+$/, "");
const appUrl = configuredAppUrl === "https://tienda-mayorista-minorista.vercel.app"
  ? "https://myaimportaciones.vercel.app"
  : configuredAppUrl;

export interface WhatsAppContact {
  id: "maximo" | "agustina";
  name: string;
  role: string;
  phone: string;
  whatsappNumber: string;
  avatarText: string;
  badge: string;
  specialty: string;
}

export const whatsappContacts: WhatsAppContact[] = [
  {
    id: "maximo",
    name: "Máximo",
    role: "Ventas y Consultas Generales",
    phone: "+54 9 249 463-8919",
    whatsappNumber: "5492494638919",
    avatarText: "M",
    badge: "Ventas & Envíos",
    specialty: "Herramientas industriales, logística, envíos a todo el país y pagos.",
  },
  {
    id: "agustina",
    name: "Agustina",
    role: "Ventas y Asesoramiento",
    phone: "+54 9 2494 25-1541",
    whatsappNumber: "5492494251541",
    avatarText: "A",
    badge: "Skincare & Capilar",
    specialty: "Cosmética coreana (K-Beauty), Kérastase, Shiseido, fragancias y rutinas.",
  },
];

export const siteConfig = {
  brandName: "MyA importaciones",
  shortName: "MyA",
  tagline: "Desde Tandil a todo el país",
  shareTitle: "MYA Importaciones | Desde Tandil a todo el país",
  description:
    "Descubrí productos originales de importación para vos, tu hogar y tu negocio. Atención personalizada de Máximo y Agustina desde Tandil y envíos a toda la Argentina.",
  email: "maximocalamante14@gmail.com",
  phone: "+54 9 249 463-8919",
  phoneAgustina: "+54 9 2494 25-1541",
  whatsappNumber: "5492494638919",
  whatsappNumberAgustina: "5492494251541",
  whatsappContacts,
  instagram: "https://www.instagram.com/_myaimportaciones/",
  instagramHandle: "@_myaimportaciones",
  location: "Tandil, Buenos Aires, Argentina",
  appUrl,
  logoUrl: "/logo.png",
  bankTransfer: {
    bank: "Mercado Pago",
    alias: "MYA.IMPORTACIONES.MP",
    cvu: "0000003100045616945389",
    cbu: "0000003100045616945389",
    holder: "Máximo Calamante",
    email: "maximocalamante14@gmail.com",
    cuit: process.env.NEXT_PUBLIC_BUSINESS_CUIT ?? "",
  },
};

export function getWhatsAppUrl(text: string, phone = siteConfig.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function getContactWhatsAppUrl(contactId: "maximo" | "agustina", text: string) {
  const contact = whatsappContacts.find((c) => c.id === contactId) || whatsappContacts[0];
  return getWhatsAppUrl(text, contact.whatsappNumber);
}

export const heroImageUrl = "/logo.png";


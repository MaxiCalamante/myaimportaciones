export const siteConfig = {
  brandName: "MYA Importaciones",
  shortName: "MYA",
  tagline: "Importación Directa & Distribución Mayorista y Minorista",
  description:
    "Tienda oficial de MYA Importaciones en Argentina. Cosmética Coreana (K-Beauty), smartphones liberados, herramientas industriales y productos importados con envíos a todo el país.",
  email: "maximocalamante14@gmail.com",
  phone: "+54 9 249 463-8919",
  whatsappNumber: "5492494638919",
  instagram: "https://www.instagram.com/_myaimportaciones/",
  instagramHandle: "@_myaimportaciones",
  location: "Buenos Aires, Argentina",
  appUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logoUrl: "/logo.png",
  bankTransfer: {
    bank: "Banco Galicia / Mercado Pago",
    alias: "MYA.IMPORTACIONES",
    cbu: "0070999930000012345678",
    holder: "MYA Importaciones",
  },
};

export function getWhatsAppUrl(text: string, phone = siteConfig.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export const heroImageUrl = "/logo.png";


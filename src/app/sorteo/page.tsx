import type { Metadata } from 'next';
import { LiveShow } from '@/components/giveaway/live-show';
import { GiveawayStoreBridge } from '@/components/giveaway/giveaway-store-bridge';
import { publicState, unavailable } from '@/lib/giveaway/server/data';
import { siteConfig } from '@/lib/site';
import { DEFAULT_CAMPAIGN } from '@/lib/giveaway/live';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sorteo Día de la Madre en Vivo · Travel Kit SKIN1004 | MYA Importaciones',
  description:
    'Viví el sorteo oficial del Día de la Madre en vivo con MYA Importaciones. Premio: Travel Kit SKIN1004 Madagascar Centella original. Cuenta regresiva transparente y selección en directo desde Tandil.',
  alternates: { canonical: `${siteConfig.appUrl}/sorteo` },
  robots: { index: true, follow: true },
  keywords: [
    'Sorteo MYA Importaciones',
    'Sorteo Día de la Madre',
    'Sorteo SKIN1004 Centella',
    'K-Beauty Argentina sorteo',
    'Cosmética coreana Tandil',
    'MYA Importaciones en vivo',
    'Sorteo Instagram @_myaimportaciones',
  ],
  openGraph: {
    title: 'Sorteo Día de la Madre en Vivo · MYA Importaciones',
    description:
      'Gran sorteo para mamá con MYA Importaciones. Premio: Travel Kit SKIN1004 Centella de cinco productos. Seguí la ruleta y el resultado en vivo.',
    url: `${siteConfig.appUrl}/sorteo`,
    siteName: siteConfig.brandName,
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/sorteo/dia-de-la-madre-instagram.jpg', width: 1080, height: 1350, alt: 'Sorteo Día de la Madre en vivo - MYA Importaciones' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sorteo Día de la Madre en Vivo · MYA Importaciones',
    description: 'Seguí el sorteo en tiempo real. Premio: Travel Kit SKIN1004 Centella original.',
    images: ['/sorteo/dia-de-la-madre-instagram.jpg'],
  },
};

const giveawayEventJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Sorteo Día de la Madre - MYA Importaciones',
  description:
    'Sorteo oficial en vivo para el Día de la Madre de MYA Importaciones. Premio: Travel Kit SKIN1004 Madagascar Centella original.',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  location: {
    '@type': 'VirtualLocation',
    url: `${siteConfig.appUrl}/sorteo`,
  },
  organizer: {
    '@type': 'Organization',
    name: siteConfig.brandName,
    url: siteConfig.appUrl,
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
    url: `${siteConfig.appUrl}/sorteo`,
  },
  image: [`${siteConfig.appUrl}/sorteo/dia-de-la-madre-instagram.jpg`],
};

export default async function GiveawayPage() {
  let state;
  try {
    state = await publicState();
  } catch {
    state = unavailable();
  }
  const event = {
    ...giveawayEventJsonLd,
    name: `${state.config.title} · ${siteConfig.brandName}`,
    description: `Sorteo de MYA Importaciones. Premio: ${state.config.prize}.`,
    ...(state.config.scheduledFor ? { startDate: state.config.scheduledFor } : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(event).replace(/</g, '\\u003c') }}
      />
      <LiveShow initial={state} />
      {state.config.prize === DEFAULT_CAMPAIGN.prize && <GiveawayStoreBridge />}
    </>
  );
}

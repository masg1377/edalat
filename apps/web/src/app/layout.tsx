import type { Metadata, Viewport } from 'next';

import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'عدالت فیلتر | تولید و فروش فیلتر و قطعات یدکی خودرو',
    template: '%s | عدالت فیلتر',
  },
  description:
    'مرجع تخصصی پیدا کردن، خرید و تولید فیلتر و قطعات مصرفی خودرو. جستجو با نام، کد فنی، خودرو، صدا یا تصویر — همراه با فروش عمده و تولید با برند اختصاصی.',
  keywords: ['فیلتر روغن', 'فیلتر هوا', 'فیلتر کابین', 'قطعات یدکی خودرو', 'فروش عمده فیلتر'],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'عدالت فیلتر',
    url: siteUrl,
  },
  robots: { index: true, follow: true },
  // Temporary Enamad domain ownership verification (&#x36; is the digit 6).
  other: { enamad: '42078176' },
};

export const viewport: Viewport = {
  themeColor: '#fedd00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // PRD §61 — RTL is declared at the document root, not patched in later.
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@synclog/brand';
import { SITE_URL } from '@/lib/site';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});

const title = `${APP_NAME} — ${APP_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: APP_NAME, title, description: APP_DESCRIPTION, url: '/' },
  twitter: { card: 'summary_large_image', title, description: APP_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: '#fbfbfd',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} overflow-x-clip antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Enables scroll-reveal styles only when JS runs, so no-JS visitors see everything. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-screen overflow-x-clip">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

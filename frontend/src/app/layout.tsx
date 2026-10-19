import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/features/auth/context/auth-context';
import { ThemeProvider } from '@/features/theme/context/theme-context';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { SiteAnalyticsTracker } from '@/components/analytics/SiteAnalyticsTracker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://minihubcar.com.br'),
  title: {
    default: 'MiniHub Car — Plataforma para Colecionadores de Miniaturas 1:64',
    template: '%s | MiniHub Car',
  },
  description:
    'Gerencie sua coleção de miniaturas 1:64, explore o catálogo oficial Hot Wheels, Mini GT, Matchbox e Maisto, controle aquisições, vendas e mapeamento de estantes físicas.',
  applicationName: 'MiniHub Car',
  keywords: [
    'MiniHub Car',
    'colecionador de miniaturas',
    'catálogo hot wheels 2026',
    'catálogo hot wheels',
    'miniaturas 1:64',
    'diecast brasil',
    'mini gt brasil',
    'matchbox',
    'maisto',
    'bburago',
    'gerenciador de coleção',
    'organizador de estantes miniaturas',
    'marketplace de miniaturas',
    'colecionismo diecast',
    'pre-vendas mini gt',
  ],
  authors: [{ name: 'Carlos Portes' }, { name: 'MiniHub Car' }],
  creator: 'MiniHub Car',
  publisher: 'MiniHub Car',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MiniHub Car — Plataforma para Colecionadores de Miniaturas 1:64',
    description:
      'A maior plataforma para colecionadores diecast do Brasil. Catálogo completo, gestão patrimonial da coleção, mapeamento de prateleiras físicas e marketplace.',
    url: 'https://minihubcar.com.br',
    siteName: 'MiniHub Car',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'MiniHub Car — Plataforma de Colecionadores',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'MiniHub Car — Plataforma para Colecionadores de Miniaturas 1:64',
    description:
      'Organize sua coleção diecast, consulte o catálogo oficial e gerencie seu acervo de miniaturas.',
    images: ['/icons/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MiniHub Car',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MiniHub Car',
  url: 'https://minihubcar.com.br',
  description:
    'Plataforma completa para colecionadores de miniaturas diecast 1:64. Catálogo oficial, gestão de acervo físico, marketplace e comunidade.',
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0.00',
    priceCurrency: 'BRL',
  },
  author: {
    '@type': 'Person',
    name: 'Carlos Portes',
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased transition-colors duration-200`}>
        <ThemeProvider>
          <I18nProvider>
            <QueryProvider>
              <AuthProvider>
                <SiteAnalyticsTracker />
                <AppShell>{children}</AppShell>
                <PwaRegister />
              </AuthProvider>
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/features/auth/context/auth-context';
import { ThemeProvider } from '@/features/theme/context/theme-context';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell';
import { PwaRegister } from '@/components/pwa/PwaRegister';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'MiniHub Car — Plataforma para Colecionadores de Miniaturas',
  description: 'Gerencie sua coleção de miniaturas 1:64, explore o catálogo oficial, controle aquisições, vendas e localizações físicas.',
  applicationName: 'MiniHub Car',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased transition-colors duration-200`}>
        <ThemeProvider>
          <I18nProvider>
            <QueryProvider>
              <AuthProvider>
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

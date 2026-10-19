import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://minihubcar.com.br';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/catalog',
          '/marketplace',
          '/community',
          '/plans',
          '/guias',
          '/donate',
          '/about',
          '/terms',
          '/privacy',
          '/termos',
          '/privacidade',
          '/estatisticas',
          '/stats',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/profile/',
          '/cart/',
          '/orders/',
          '/seller/',
          '/locations/',
          '/import/',
          '/acquisitions/',
          '/catalog-requests/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

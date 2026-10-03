import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MiniHub Car — Plataforma de Miniaturas',
    short_name: 'MiniHub Car',
    description: 'Gerencie sua coleção de miniaturas 1:64, explore o catálogo oficial e controle aquisições e vendas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

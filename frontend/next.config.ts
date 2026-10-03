import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.platform === 'win32' && !process.env.DOCKER_BUILD ? undefined : 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
    return [
      {
        source: '/catalog-media/:path*',
        destination: `${backendUrl}/catalog-media/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

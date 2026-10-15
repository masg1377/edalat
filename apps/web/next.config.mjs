import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Pin the monorepo root explicitly. Without this Next infers it from the
  // nearest lockfile, which in a workspace setup can resolve outside the repo.
  outputFileTracingRoot: path.join(here, '../..'),
  // `/products` is canonical (PRD §63 puts product URLs under /products/…).
  // These keep older links and any bookmarked search URLs working.
  async redirects() {
    return [
      { source: '/store', destination: '/products', permanent: true },
      { source: '/search', destination: '/products', permanent: true },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // MinIO in development; the production bucket host is configured per env.
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' },
      { protocol: 'https', hostname: '**.edalatfilter.ir' },
    ],
  },
};

export default nextConfig;

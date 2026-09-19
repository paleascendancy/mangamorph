import type { NextConfig } from 'next';

const chromiumFiles = [
  './node_modules/@sparticuz/chromium/bin/**/*',
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/admin/catalog/new': chromiumFiles,
    '/api/internal/catalog-sync': chromiumFiles,
    '/obra/[id]/capitulo/[chapterId]': chromiumFiles,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'media.kitsu.app' },
      { protocol: 'https', hostname: 'media.kitsu.io' },
    ],
  },
};

export default nextConfig;

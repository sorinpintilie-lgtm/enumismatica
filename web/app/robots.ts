import type { MetadataRoute } from 'next';
import { buildAbsoluteUrl } from './lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard', '/login', '/register', '/settings', '/seed-db'],
      },
    ],
    sitemap: buildAbsoluteUrl('/sitemap.xml'),
    host: buildAbsoluteUrl('/'),
  };
}


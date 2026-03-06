import type { MetadataRoute } from 'next';
import { buildAbsoluteUrl } from './lib/seo';
import { listSeoProductEntries } from './lib/productSeoData';

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/products', priority: 0.95, changeFrequency: 'hourly' },
  { path: '/auctions', priority: 0.9, changeFrequency: 'hourly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/gdpr', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: buildAbsoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productEntries = await listSeoProductEntries(5000);

  const dynamicProductEntries: MetadataRoute.Sitemap = productEntries.map((product) => ({
    url: buildAbsoluteUrl(`/products/${product.id}`),
    lastModified: product.updatedAt || now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticEntries, ...dynamicProductEntries];
}


import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { getRawListing, getTaxonomyList } from '@/lib/content-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${siteConfig.url}/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteConfig.url}/results`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteConfig.url}/admit-cards`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteConfig.url}/admissions`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteConfig.url}/states`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteConfig.url}/organizations`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteConfig.url}/archive`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];

  try {
    const [jobs, results, admitCards, admissions, states, organizations] = await Promise.all([
      getRawListing({ type: 'job', limit: 50 }),
      getRawListing({ type: 'result', limit: 50 }),
      getRawListing({ type: 'admit-card', limit: 50 }),
      getRawListing({ type: 'admission', limit: 50 }),
      getTaxonomyList('states'),
      getTaxonomyList('organizations'),
    ]);

    return [
      ...staticEntries,
      ...jobs.map((item) => ({ url: `${siteConfig.url}${item.href}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 })),
      ...results.map((item) => ({ url: `${siteConfig.url}${item.href}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 })),
      ...admitCards.map((item) => ({ url: `${siteConfig.url}${item.href}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 })),
      ...admissions.map((item) => ({ url: `${siteConfig.url}${item.href}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 })),
      ...states.map((item) => ({ url: `${siteConfig.url}/states/${item.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 })),
      ...organizations.map((item) => ({ url: `${siteConfig.url}/organizations/${item.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 })),
    ];
  } catch {
    return staticEntries;
  }
}

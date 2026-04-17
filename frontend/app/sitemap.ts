import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { getContentPagesByType, getRawListing, getTaxonomyList } from '@/lib/content-api';

export const revalidate = 300;

const LISTING_TYPES = [
  { type: 'job' as const, path: '/jobs', priority: 0.9 },
  { type: 'result' as const, path: '/results', priority: 0.9 },
  { type: 'admit-card' as const, path: '/admit-cards', priority: 0.9 },
  { type: 'admission' as const, path: '/admissions', priority: 0.9 },
  { type: 'answer-key' as const, path: '/answer-keys', priority: 0.85 },
] as const;

const CONTENT_PAGE_TYPES = ['info', 'auxiliary', 'community', 'resource_meta'] as const;

function contentPageHref(page: { slug: string; pageType: string; seoCanonicalPath?: string | null }) {
  if (page.seoCanonicalPath) {
    return page.seoCanonicalPath.startsWith('/') ? page.seoCanonicalPath : `/${page.seoCanonicalPath}`;
  }

  if (page.pageType === 'community') {
    return `/join/${page.slug}`;
  }

  return `/${page.slug}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    ...LISTING_TYPES.map((item) => ({
      url: `${siteConfig.url}${item.path}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: item.priority,
    })),
    { url: `${siteConfig.url}/states`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteConfig.url}/organizations`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteConfig.url}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteConfig.url}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
  ];

  try {
    const [jobs, results, admitCards, admissions, answerKeys, states, organizations, ...contentPageResults] = await Promise.all([
      getRawListing({ type: 'job', limit: 100 }),
      getRawListing({ type: 'result', limit: 100 }),
      getRawListing({ type: 'admit-card', limit: 100 }),
      getRawListing({ type: 'admission', limit: 100 }),
      getRawListing({ type: 'answer-key', limit: 100 }),
      getTaxonomyList('states'),
      getTaxonomyList('organizations'),
      ...CONTENT_PAGE_TYPES.map((type) => getContentPagesByType(type, 100)),
    ]);

    const entries = new Map<string, MetadataRoute.Sitemap[number]>();

    const addEntry = (entry: MetadataRoute.Sitemap[number]) => {
      entries.set(entry.url, entry);
    };

    staticEntries.forEach(addEntry);
    jobs.forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }));
    results.forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }));
    admitCards.forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }));
    admissions.forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }));
    answerKeys.forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: now, changeFrequency: 'daily', priority: 0.75 }));
    states.forEach((item) => addEntry({ url: `${siteConfig.url}/states/${item.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 }));
    organizations.forEach((item) => addEntry({ url: `${siteConfig.url}/organizations/${item.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 }));
    contentPageResults
      .flat()
      .forEach((page) => addEntry({ url: `${siteConfig.url}${contentPageHref(page)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 }));

    return Array.from(entries.values());
  } catch {
    return staticEntries;
  }
}

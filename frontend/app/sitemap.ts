import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { getContentPagesByType, getRawListing, getTaxonomyList } from '@/lib/content-api';
import { auxiliaryPageMeta, communityPageMeta, infoPageMeta, resourceCategoryMeta } from '@/app/lib/public-content';

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

function lastModified(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const localStaticPaths = [
    ...Object.values(infoPageMeta).map((item) => item.canonicalPath),
    ...Object.values(auxiliaryPageMeta).map((item) => item.canonicalPath),
    ...Object.values(resourceCategoryMeta).map((item) => item.canonicalPath),
    ...Object.values(communityPageMeta).map((item) => item.canonicalPath),
  ];
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
    { url: `${siteConfig.url}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    ...localStaticPaths.map((path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    })),
  ];

  try {
    const [jobs, results, admitCards, admissions, answerKeys, states, organizations, ...contentPageResults] = await Promise.all([
      getRawListing({ type: 'job', limit: 500 }),
      getRawListing({ type: 'result', limit: 500 }),
      getRawListing({ type: 'admit-card', limit: 500 }),
      getRawListing({ type: 'admission', limit: 500 }),
      getRawListing({ type: 'answer-key', limit: 500 }),
      getTaxonomyList('states'),
      getTaxonomyList('organizations'),
      ...CONTENT_PAGE_TYPES.map((type) => getContentPagesByType(type, 100)),
    ]);

    const entries = new Map<string, MetadataRoute.Sitemap[number]>();

    const addEntry = (entry: MetadataRoute.Sitemap[number]) => {
      entries.set(entry.url, entry);
    };

    staticEntries.forEach(addEntry);
    jobs.filter((item) => item.indexable !== false).forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: lastModified(item.updatedAt || item.publishedAt), changeFrequency: 'daily', priority: 0.8 }));
    results.filter((item) => item.indexable !== false).forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: lastModified(item.updatedAt || item.publishedAt), changeFrequency: 'daily', priority: 0.8 }));
    admitCards.filter((item) => item.indexable !== false).forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: lastModified(item.updatedAt || item.publishedAt), changeFrequency: 'daily', priority: 0.8 }));
    admissions.filter((item) => item.indexable !== false).forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: lastModified(item.updatedAt || item.publishedAt), changeFrequency: 'daily', priority: 0.8 }));
    answerKeys.filter((item) => item.indexable !== false).forEach((item) => addEntry({ url: `${siteConfig.url}${item.href}`, lastModified: lastModified(item.updatedAt || item.publishedAt), changeFrequency: 'daily', priority: 0.75 }));
    states.forEach((item) => addEntry({ url: `${siteConfig.url}/states/${item.slug}`, lastModified: lastModified(item.updatedAt), changeFrequency: 'daily', priority: 0.7 }));
    organizations.forEach((item) => addEntry({ url: `${siteConfig.url}/organizations/${item.slug}`, lastModified: lastModified(item.updatedAt), changeFrequency: 'daily', priority: 0.7 }));
    contentPageResults
      .flat()
      .forEach((page) => addEntry({ url: `${siteConfig.url}${contentPageHref(page)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 }));

    return Array.from(entries.values());
  } catch {
    return staticEntries;
  }
}

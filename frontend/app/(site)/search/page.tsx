import type { Metadata } from 'next';

import { PublicSearchPage } from '@/app/components/public-site/PublicSearchPage';
import { buildNoIndexMetadata } from '@/app/lib/metadata';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getRawListing } from '@/lib/content-api';

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Search Updates',
  description: 'Internal search results for jobs, results, admit cards, and admissions.',
  canonicalPath: '/search',
  keywords: ['search'],
});


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query
    ? await Promise.all([
        getRawListing({ type: 'job', search: query, limit: 8 }).then((entries) => ({
          entries: entries.map((entry) => ({
            href: entry.href,
            title: entry.title,
            org: entry.org,
            date: entry.date,
            tag: entry.tag,
            postCount: entry.postCount,
            qualification: entry.qualification,
          })),
          meta: announcementCategoryMeta.jobs,
          section: 'jobs' as const,
        })),
        getRawListing({ type: 'result', search: query, limit: 8 }).then((entries) => ({
          entries: entries.map((entry) => ({
            href: entry.href,
            title: entry.title,
            org: entry.org,
            date: entry.date,
            tag: entry.tag,
            postCount: entry.postCount,
            qualification: entry.qualification,
          })),
          meta: announcementCategoryMeta.results,
          section: 'results' as const,
        })),
        getRawListing({ type: 'admit-card', search: query, limit: 8 }).then((entries) => ({
          entries: entries.map((entry) => ({
            href: entry.href,
            title: entry.title,
            org: entry.org,
            date: entry.date,
            tag: entry.tag,
            postCount: entry.postCount,
            qualification: entry.qualification,
          })),
          meta: announcementCategoryMeta['admit-cards'],
          section: 'admit-cards' as const,
        })),
        getRawListing({ type: 'admission', search: query, limit: 8 }).then((entries) => ({
          entries: entries.map((entry) => ({
            href: entry.href,
            title: entry.title,
            org: entry.org,
            date: entry.date,
            tag: entry.tag,
            postCount: entry.postCount,
            qualification: entry.qualification,
          })),
          meta: announcementCategoryMeta.admissions,
          section: 'admissions' as const,
        })),
      ])
    : [];

  return <PublicSearchPage query={query} results={results.filter((group) => group.entries.length > 0)} />;
}

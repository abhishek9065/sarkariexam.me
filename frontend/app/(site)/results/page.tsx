import type { Metadata } from 'next';

import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildListingMetadata } from '@/app/lib/listing-seo';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getListingEntries } from '@/lib/content-api';

const pageSeo = {
  title: 'Latest Sarkari Exam Results and Merit Lists',
  description:
    'Check recently declared government exam results, merit lists, score cards, and official result notifications from major recruiting bodies.',
  keywords: ['latest result', 'sarkari exam result', 'merit list', 'score card'],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}): Promise<Metadata> {
  return buildListingMetadata({
    meta: announcementCategoryMeta.results,
    ...pageSeo,
    searchParams: await searchParams,
  });
}


export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'result', search, state, organization, limit: 30 });

  return (
    <>
      <JsonLd data={collectionJsonLd(announcementCategoryMeta.results, entries)} />
      <PublicCategoryHubPage
        meta={announcementCategoryMeta.results}
        entries={entries}
        querySummary={search?.trim() || state?.trim() || organization?.trim()
          ? `Showing result updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
          : undefined}
        clearHref={announcementCategoryMeta.results.canonicalPath}
      />
    </>
  );
}

import type { Metadata } from 'next';

import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildListingMetadata } from '@/app/lib/listing-seo';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getListingEntries } from '@/lib/content-api';

const pageSeo = {
  title: 'Latest Admissions, Entrance Forms, and Counseling',
  description:
    'Explore admission notifications, entrance form releases, counseling schedules, and university application updates from official channels.',
  keywords: ['admission form', 'entrance exam admission', 'counseling schedule', 'university admission'],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}): Promise<Metadata> {
  return buildListingMetadata({
    meta: announcementCategoryMeta.admissions,
    ...pageSeo,
    searchParams: await searchParams,
  });
}


export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'admission', search, state, organization, limit: 30 });

  return (
    <>
      <JsonLd data={collectionJsonLd(announcementCategoryMeta.admissions, entries)} />
      <PublicCategoryHubPage
        meta={announcementCategoryMeta.admissions}
        entries={entries}
        querySummary={search?.trim() || state?.trim() || organization?.trim()
          ? `Showing admission updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
          : undefined}
        clearHref={announcementCategoryMeta.admissions.canonicalPath}
      />
    </>
  );
}

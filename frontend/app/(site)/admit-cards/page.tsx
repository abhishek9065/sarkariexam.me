import type { Metadata } from 'next';

import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildListingMetadata } from '@/app/lib/listing-seo';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getListingEntries } from '@/lib/content-api';

const pageSeo = {
  title: 'Latest Admit Cards and Exam City Slips',
  description:
    'Download latest admit cards, exam city slips, and hall ticket notices for upcoming government exams from official sources.',
  keywords: ['admit card download', 'hall ticket', 'exam city slip', 'government exam admit card'],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}): Promise<Metadata> {
  return buildListingMetadata({
    meta: announcementCategoryMeta['admit-cards'],
    ...pageSeo,
    searchParams: await searchParams,
  });
}


export default async function AdmitCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'admit-card', search, state, organization, limit: 30 });

  return (
    <>
      <JsonLd data={collectionJsonLd(announcementCategoryMeta['admit-cards'], entries)} />
      <PublicCategoryHubPage
        meta={announcementCategoryMeta['admit-cards']}
        entries={entries}
        querySummary={search?.trim() || state?.trim() || organization?.trim()
          ? `Showing admit card updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
          : undefined}
        clearHref={announcementCategoryMeta['admit-cards'].canonicalPath}
      />
    </>
  );
}

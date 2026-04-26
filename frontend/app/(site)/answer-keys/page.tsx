import type { Metadata } from 'next';

import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildListingMetadata } from '@/app/lib/listing-seo';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getListingEntries } from '@/lib/content-api';

const pageSeo = {
  title: 'Official Answer Keys and Objection Windows',
  description:
    'Track latest official answer keys, response sheets, and objection date windows for government recruitment and entrance exams.',
  keywords: ['answer key', 'official answer key', 'objection window', 'response sheet'],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}): Promise<Metadata> {
  return buildListingMetadata({
    meta: announcementCategoryMeta['answer-keys'],
    ...pageSeo,
    searchParams: await searchParams,
  });
}


export default async function AnswerKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'answer-key', search, state, organization, limit: 30 });

  return (
    <>
      <JsonLd data={collectionJsonLd(announcementCategoryMeta['answer-keys'], entries)} />
      <PublicCategoryHubPage
        meta={announcementCategoryMeta['answer-keys']}
        entries={entries}
        querySummary={search?.trim() || state?.trim() || organization?.trim()
          ? `Showing answer key updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
          : undefined}
        clearHref={announcementCategoryMeta['answer-keys'].canonicalPath}
      />
    </>
  );
}

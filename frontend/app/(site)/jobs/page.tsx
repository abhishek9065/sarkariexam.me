import type { Metadata } from 'next';

import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildListingMetadata } from '@/app/lib/listing-seo';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getListingEntries } from '@/lib/content-api';

const pageSeo = {
  title: 'Latest Government Jobs and Online Forms',
  description:
    'Browse the latest government job notifications, online forms, eligibility details, and deadline updates across central and state recruitment boards.',
  keywords: ['latest jobs', 'government job vacancy', 'sarkari naukri online form', 'recruitment notification'],
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; organization?: string; state?: string; qualification?: string; search?: string }>;
}): Promise<Metadata> {
  return buildListingMetadata({
    meta: announcementCategoryMeta.jobs,
    ...pageSeo,
    searchParams: await searchParams,
  });
}


function buildJobsSummary(search?: string, organization?: string, state?: string, qualification?: string) {
  const parts = [];

  if (search?.trim()) {
    parts.push(`search "${search.trim()}"`);
  }

  if (organization?.trim()) {
    parts.push(`organization "${organization.trim()}"`);
  }

  if (state?.trim()) {
    parts.push(`state "${state.trim()}"`);
  }

  if (qualification?.trim()) {
    parts.push(`qualification "${qualification.trim()}"`);
  }

  return parts.length > 0 ? `Showing jobs for ${parts.join(' + ')}.` : undefined;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; organization?: string; state?: string; qualification?: string; search?: string }>;
}) {
  const { department, organization, state, qualification, search } = await searchParams;
  const effectiveOrganization = organization || department;
  const entries = await getListingEntries({
    type: 'job',
    search,
    organization: effectiveOrganization,
    state,
    qualification,
    limit: 30,
  });

  return (
    <>
      <JsonLd data={collectionJsonLd(announcementCategoryMeta.jobs, entries)} />
      <PublicCategoryHubPage
        meta={announcementCategoryMeta.jobs}
        entries={entries}
        querySummary={buildJobsSummary(search, effectiveOrganization, state, qualification)}
        clearHref={announcementCategoryMeta.jobs.canonicalPath}
      />
    </>
  );
}

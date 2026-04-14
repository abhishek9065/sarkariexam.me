import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getListingEntries } from '@/lib/content-api';


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
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.jobs}
      entries={entries}
      querySummary={buildJobsSummary(search, effectiveOrganization, state, qualification)}
      clearHref={announcementCategoryMeta.jobs.canonicalPath}
    />
  );
}

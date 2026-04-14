import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getListingEntries } from '@/lib/content-api';


export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'result', search, state, organization, limit: 30 });

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.results}
      entries={entries}
      querySummary={search?.trim() || state?.trim() || organization?.trim()
        ? `Showing result updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
        : undefined}
      clearHref={announcementCategoryMeta.results.canonicalPath}
    />
  );
}

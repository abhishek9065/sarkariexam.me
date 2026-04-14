import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getListingEntries } from '@/lib/content-api';


export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'admission', search, state, organization, limit: 30 });

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.admissions}
      entries={entries}
      querySummary={search?.trim() || state?.trim() || organization?.trim()
        ? `Showing admission updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
        : undefined}
      clearHref={announcementCategoryMeta.admissions.canonicalPath}
    />
  );
}

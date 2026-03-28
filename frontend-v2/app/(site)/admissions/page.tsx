import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.admissions}
      entries={getAnnouncementEntries('admissions', { search })}
      querySummary={search?.trim() ? `Showing admission updates for "${search.trim()}".` : undefined}
      clearHref={announcementCategoryMeta.admissions.canonicalPath}
    />
  );
}

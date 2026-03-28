import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.results}
      entries={getAnnouncementEntries('results', { search })}
      querySummary={search?.trim() ? `Showing result updates for "${search.trim()}".` : undefined}
      clearHref={announcementCategoryMeta.results.canonicalPath}
    />
  );
}

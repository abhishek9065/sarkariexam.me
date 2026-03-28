import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default async function AdmitCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta['admit-cards']}
      entries={getAnnouncementEntries('admit-cards', { search })}
      querySummary={search?.trim() ? `Showing admit card updates for "${search.trim()}".` : undefined}
      clearHref={announcementCategoryMeta['admit-cards'].canonicalPath}
    />
  );
}

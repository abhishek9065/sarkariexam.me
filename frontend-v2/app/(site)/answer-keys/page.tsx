import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default async function AnswerKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta['answer-keys']}
      entries={getAnnouncementEntries('answer-keys', { search })}
      querySummary={search?.trim() ? `Showing answer key updates for "${search.trim()}".` : undefined}
      clearHref={announcementCategoryMeta['answer-keys'].canonicalPath}
    />
  );
}

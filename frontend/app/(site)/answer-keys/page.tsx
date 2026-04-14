import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getListingEntries } from '@/lib/content-api';


export default async function AnswerKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; organization?: string }>;
}) {
  const { search, state, organization } = await searchParams;
  const entries = await getListingEntries({ type: 'answer-key', search, state, organization, limit: 30 });

  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta['answer-keys']}
      entries={entries}
      querySummary={search?.trim() || state?.trim() || organization?.trim()
        ? `Showing answer key updates${search?.trim() ? ` for "${search.trim()}"` : ''}${state?.trim() ? ` in ${state.trim()}` : ''}${organization?.trim() ? ` from ${organization.trim()}` : ''}.`
        : undefined}
      clearHref={announcementCategoryMeta['answer-keys'].canonicalPath}
    />
  );
}

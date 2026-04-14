import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getListingEntries } from '@/lib/content-api';


export default async function ArchivePage() {
  const entries = await getListingEntries({ status: 'expired', limit: 40 });

  return (
    <PublicCategoryHubPage
      meta={{
        ...announcementCategoryMeta.jobs,
        canonicalPath: '/archive',
        title: 'Expired and Archived Updates',
        eyebrow: 'Archive',
        description: 'Previously published job, result, admit-card, and admission updates that are no longer active.',
        listingTitle: 'Archive Feed',
      }}
      entries={entries}
      querySummary="Showing expired or archived updates for reference and SEO continuity."
      clearHref="/archive"
    />
  );
}

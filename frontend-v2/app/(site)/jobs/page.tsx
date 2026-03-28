import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default function JobsPage() {
  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta.jobs}
      entries={getAnnouncementEntries('jobs')}
    />
  );
}

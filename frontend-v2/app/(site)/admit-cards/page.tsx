import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default function AdmitCardsPage() {
  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta['admit-cards']}
      entries={getAnnouncementEntries('admit-cards')}
    />
  );
}

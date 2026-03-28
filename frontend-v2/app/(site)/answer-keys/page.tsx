import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { announcementCategoryMeta, getAnnouncementEntries } from '@/app/lib/public-content';

export default function AnswerKeysPage() {
  return (
    <PublicCategoryHubPage
      meta={announcementCategoryMeta['answer-keys']}
      entries={getAnnouncementEntries('answer-keys')}
    />
  );
}

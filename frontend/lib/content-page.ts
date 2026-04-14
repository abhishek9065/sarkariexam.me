import type { AnnouncementSection, PortalListEntry } from '@/app/lib/public-content';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { getDetail, mapDetailToAnnouncementItem } from './content-api';

export async function loadDetailPage(section: AnnouncementSection, slug: string) {
  const detail = await getDetail(slug);
  const mapped = mapDetailToAnnouncementItem(detail);
  const canonicalSection = mapped.section;

  return {
    canonicalPath: detail.canonicalPath,
    isCanonicalSection: canonicalSection === section,
    item: mapped,
    meta: announcementCategoryMeta[canonicalSection],
    relatedEntries: detail.relatedCards.map<PortalListEntry>((card) => ({
      href: card.href,
      title: card.title,
      org: card.org,
      date: card.date,
      tag: card.tag,
      postCount: card.postCount,
      qualification: card.qualification,
    })),
  };
}

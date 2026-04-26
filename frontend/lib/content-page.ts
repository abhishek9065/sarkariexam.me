import type { AnnouncementSection, PortalListEntry } from '@/app/lib/public-content';
import { announcementCategoryMeta } from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { getDetail, mapDetailToAnnouncementItem } from './content-api';

export async function loadDetailPage(section: AnnouncementSection, slug: string) {
  const detail = await getDetail(slug);
  const mapped = mapDetailToAnnouncementItem(detail);
  const canonicalSection = mapped.section;

  return {
    breadcrumbs: detail.breadcrumbs,
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
      publishedAt: card.publishedAt,
      updatedAt: card.updatedAt,
    })),
    seo: detail.post.seo,
  };
}

export function buildDetailPageMetadata(resolved: Awaited<ReturnType<typeof loadDetailPage>>) {
  const canonicalPath = resolved.seo?.effectiveCanonicalPath || resolved.canonicalPath;
  const description =
    resolved.seo?.effectiveDescription ||
    resolved.item.summary ||
    resolved.item.shortInfo;

  return buildPageMetadata({
    title: resolved.seo?.effectiveTitle || resolved.item.title,
    description,
    canonicalPath,
    type: 'article',
    noindex: resolved.seo?.indexable === false,
    keywords: [
      resolved.item.org,
      resolved.meta.title,
      ...resolved.item.departments,
      ...resolved.item.keywords,
    ],
  });
}

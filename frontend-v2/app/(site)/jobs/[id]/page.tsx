import { notFound } from 'next/navigation';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import {
  announcementCategoryMeta,
  announcementItemsBySection,
  buildAnnouncementPath,
  getAnnouncementByParam,
  getAnnouncementEntries,
} from '@/app/lib/public-content';

export function generateStaticParams() {
  return announcementItemsBySection.jobs.map((item) => ({ id: item.slug }));
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = getAnnouncementByParam('jobs', id);

  if (!resolved) {
    notFound();
  }

  return (
    <PublicAnnouncementDetailPage
      meta={announcementCategoryMeta.jobs}
      item={resolved.item}
      relatedEntries={getAnnouncementEntries('jobs').filter((entry) => entry.href !== buildAnnouncementPath(resolved.item)).slice(0, 6)}
    />
  );
}

import { notFound, redirect } from 'next/navigation';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import {
  announcementCategoryMeta,
  announcementItemsBySection,
  buildAnnouncementPath,
  getAnnouncementEntries,
  resolveAnnouncementParam,
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
  const resolved = resolveAnnouncementParam('jobs', id);

  if (!resolved) {
    notFound();
  }

  if (resolved.matchType !== 'canonical') {
    redirect(resolved.canonicalPath);
  }

  return (
    <PublicAnnouncementDetailPage
      meta={announcementCategoryMeta.jobs}
      item={resolved.item}
      relatedEntries={getAnnouncementEntries('jobs').filter((entry) => entry.href !== buildAnnouncementPath(resolved.item)).slice(0, 6)}
    />
  );
}

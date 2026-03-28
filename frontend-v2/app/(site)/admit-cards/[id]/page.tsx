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
  return announcementItemsBySection['admit-cards'].map((item) => ({ id: item.slug }));
}

export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = resolveAnnouncementParam('admit-cards', id);

  if (!resolved) {
    notFound();
  }

  if (resolved.matchType !== 'canonical') {
    redirect(resolved.canonicalPath);
  }

  return (
    <PublicAnnouncementDetailPage
      meta={announcementCategoryMeta['admit-cards']}
      item={resolved.item}
      relatedEntries={getAnnouncementEntries('admit-cards').filter((entry) => entry.href !== buildAnnouncementPath(resolved.item)).slice(0, 6)}
    />
  );
}

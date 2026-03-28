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
  return announcementItemsBySection.admissions.map((item) => ({ slug: item.slug }));
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = getAnnouncementByParam('admissions', slug);

  if (!resolved) {
    notFound();
  }

  return (
    <PublicAnnouncementDetailPage
      meta={announcementCategoryMeta.admissions}
      item={resolved.item}
      relatedEntries={getAnnouncementEntries('admissions').filter((entry) => entry.href !== buildAnnouncementPath(resolved.item)).slice(0, 6)}
    />
  );
}

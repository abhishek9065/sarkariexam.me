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
  return announcementItemsBySection['answer-keys'].map((item) => ({ slug: item.slug }));
}

export default async function AnswerKeyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveAnnouncementParam('answer-keys', slug);

  if (!resolved) {
    notFound();
  }

  if (resolved.matchType !== 'canonical') {
    redirect(resolved.canonicalPath);
  }

  return (
    <PublicAnnouncementDetailPage
      meta={announcementCategoryMeta['answer-keys']}
      item={resolved.item}
      relatedEntries={getAnnouncementEntries('answer-keys').filter((entry) => entry.href !== buildAnnouncementPath(resolved.item)).slice(0, 6)}
    />
  );
}

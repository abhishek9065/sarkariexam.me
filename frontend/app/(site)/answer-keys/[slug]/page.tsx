import { notFound, redirect } from 'next/navigation';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { loadDetailPage } from '@/lib/content-page';

export const revalidate = 300;

export default async function AnswerKeyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let resolved;

  try {
    const { slug } = await params;
    resolved = await loadDetailPage('answer-keys', slug);

    if (!resolved.isCanonicalSection || resolved.item.slug !== slug) {
      const canonicalPath = normalizeInternalHref(resolved.canonicalPath);
      if (!canonicalPath) {
        notFound();
      }
      redirect(canonicalPath);
    }
  } catch {
    notFound();
  }

  return (
    <PublicAnnouncementDetailPage
      meta={resolved.meta}
      item={resolved.item}
      relatedEntries={resolved.relatedEntries}
    />
  );
}

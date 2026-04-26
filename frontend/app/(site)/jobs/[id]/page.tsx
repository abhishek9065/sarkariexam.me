import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { announcementJsonLd } from '@/app/lib/structured-data';
import { buildDetailPageMetadata, loadDetailPage } from '@/lib/content-page';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const resolved = await loadDetailPage('jobs', id);
    return buildDetailPageMetadata(resolved);
  } catch {
    notFound();
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let resolved;

  try {
    const { id } = await params;
    resolved = await loadDetailPage('jobs', id);

    if (!resolved.isCanonicalSection || resolved.item.slug !== id) {
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
    <>
      <JsonLd data={announcementJsonLd(resolved.item, resolved.seo?.effectiveCanonicalPath || resolved.canonicalPath, resolved.breadcrumbs)} />
      <PublicAnnouncementDetailPage
        meta={resolved.meta}
        item={resolved.item}
        relatedEntries={resolved.relatedEntries}
      />
    </>
  );
}

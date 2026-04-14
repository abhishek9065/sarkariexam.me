import { notFound, redirect } from 'next/navigation';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import { loadDetailPage } from '@/lib/content-page';


export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let resolved;

  try {
    const { id } = await params;
    resolved = await loadDetailPage('admit-cards', id);

    if (!resolved.isCanonicalSection || resolved.item.slug !== id) {
      redirect(resolved.canonicalPath);
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

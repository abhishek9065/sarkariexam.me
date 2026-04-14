import { notFound, redirect } from 'next/navigation';
import { PublicAnnouncementDetailPage } from '@/app/components/public-site/PublicAnnouncementDetailPage';
import { loadDetailPage } from '@/lib/content-page';


export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let resolved;

  try {
    const { slug } = await params;
    resolved = await loadDetailPage('admissions', slug);

    if (!resolved.isCanonicalSection || resolved.item.slug !== slug) {
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

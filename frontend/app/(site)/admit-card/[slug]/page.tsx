import { notFound, redirect } from 'next/navigation';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { loadDetailPage } from '@/lib/content-page';


export default async function AdmitCardAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const resolved = await loadDetailPage('admit-cards', slug);
    const canonicalPath = normalizeInternalHref(resolved.canonicalPath);
    if (!canonicalPath) {
      notFound();
    }
    redirect(canonicalPath);
  } catch {
    notFound();
  }
}

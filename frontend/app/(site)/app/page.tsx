import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export default async function AppDownloadPage() {
  const fallback = getAuxiliaryPageBySlug('app') || undefined;
  const meta = await loadAuxiliaryPageMeta('app', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

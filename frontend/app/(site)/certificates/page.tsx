import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export default async function CertificatesPage() {
  const fallback = getAuxiliaryPageBySlug('certificates') || undefined;
  const meta = await loadAuxiliaryPageMeta('certificates', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

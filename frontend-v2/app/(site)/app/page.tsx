import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';

export default function AppDownloadPage() {
  const meta = getAuxiliaryPageBySlug('app');

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

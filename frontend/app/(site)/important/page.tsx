import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export default async function ImportantLinksPage() {
  const fallback = getAuxiliaryPageBySlug('important') || undefined;
  const meta = await loadAuxiliaryPageMeta('important', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

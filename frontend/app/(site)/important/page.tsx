import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';

export default function ImportantLinksPage() {
  const meta = getAuxiliaryPageBySlug('important');

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export async function generateMetadata(): Promise<Metadata> {
  const fallback = getAuxiliaryPageBySlug('important') || undefined;
  const meta = await loadAuxiliaryPageMeta('important', fallback);

  if (!meta) {
    return buildPageMetadata({
      title: 'Important Links',
      description: 'Official and high-utility public service links for exams, jobs, and verification resources.',
      canonicalPath: '/important',
      keywords: ['important links', 'official websites', 'public portals'],
    });
  }

  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: meta.canonicalPath,
    keywords: ['important links', 'official portals', 'government exam links'],
  });
}

export default async function ImportantLinksPage() {
  const fallback = getAuxiliaryPageBySlug('important') || undefined;
  const meta = await loadAuxiliaryPageMeta('important', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

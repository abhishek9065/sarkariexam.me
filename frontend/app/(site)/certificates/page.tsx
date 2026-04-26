import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export async function generateMetadata(): Promise<Metadata> {
  const fallback = getAuxiliaryPageBySlug('certificates') || undefined;
  const meta = await loadAuxiliaryPageMeta('certificates', fallback);

  if (!meta) {
    return buildPageMetadata({
      title: 'Certificates and Verification Support',
      description: 'Certificate verification links, supporting resources, and document assistance pages.',
      canonicalPath: '/certificates',
      keywords: ['certificate verification', 'document support', 'marksheet resources'],
    });
  }

  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: meta.canonicalPath,
    keywords: ['certificate support', 'verification links', 'document help'],
  });
}

export default async function CertificatesPage() {
  const fallback = getAuxiliaryPageBySlug('certificates') || undefined;
  const meta = await loadAuxiliaryPageMeta('certificates', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

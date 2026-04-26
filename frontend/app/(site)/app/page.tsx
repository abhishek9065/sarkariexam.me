import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicAuxiliaryPage } from '@/app/components/public-site/PublicAuxiliaryPage';
import { getAuxiliaryPageBySlug } from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { loadAuxiliaryPageMeta } from '@/lib/content-api';

export async function generateMetadata(): Promise<Metadata> {
  const fallback = getAuxiliaryPageBySlug('app') || undefined;
  const meta = await loadAuxiliaryPageMeta('app', fallback);

  if (!meta) {
    return buildPageMetadata({
      title: 'App Download and Mobile Access',
      description: 'Access mobile-friendly updates, app alternatives, and channel links for jobs and exam notifications.',
      canonicalPath: '/app',
      keywords: ['app download', 'mobile alerts', 'exam updates app'],
    });
  }

  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: meta.canonicalPath,
    keywords: ['mobile access', 'alert channels', 'app update'],
  });
}

export default async function AppDownloadPage() {
  const fallback = getAuxiliaryPageBySlug('app') || undefined;
  const meta = await loadAuxiliaryPageMeta('app', fallback);

  if (!meta) {
    notFound();
  }

  return <PublicAuxiliaryPage meta={meta} />;
}

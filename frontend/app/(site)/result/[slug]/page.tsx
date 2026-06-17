import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildNoIndexMetadata } from '@/app/lib/metadata';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { loadDetailPage } from '@/lib/content-page';

export const revalidate = 300;

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Legacy Result Alias',
  description: 'Legacy result alias route that redirects to canonical result detail pages.',
  canonicalPath: '/results',
  keywords: ['legacy result alias'],
});

export default async function ResultAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let canonicalPath: string | null = null;

  try {
    const { slug } = await params;
    const resolved = await loadDetailPage('results', slug);
    canonicalPath = normalizeInternalHref(resolved.canonicalPath);
  } catch {
    notFound();
  }

  if (!canonicalPath) {
    notFound();
  }

  redirect(canonicalPath);
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildNoIndexMetadata } from '@/app/lib/metadata';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { loadDetailPage } from '@/lib/content-page';

export const revalidate = 300;

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Legacy Admit Card Alias',
  description: 'Legacy admit card alias route that redirects to canonical admit card detail pages.',
  canonicalPath: '/admit-cards',
  keywords: ['legacy admit card alias'],
});

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

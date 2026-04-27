import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildNoIndexMetadata } from '@/app/lib/metadata';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { getDetail } from '@/lib/content-api';

export const revalidate = 300;

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Legacy Detail Alias',
  description: 'Legacy detail alias route that redirects to canonical announcement pages.',
  canonicalPath: '/',
  keywords: ['legacy detail alias'],
});

export default async function LegacyDetailAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const resolved = await getDetail(slug);
    const canonicalPath = normalizeInternalHref(resolved.canonicalPath);
    if (!canonicalPath) {
      notFound();
    }
    redirect(canonicalPath);
  } catch {
    notFound();
  }
}

import { notFound, redirect } from 'next/navigation';
import { resolveAnnouncementAcrossSections } from '@/app/lib/public-content';

export default async function LegacyDetailAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveAnnouncementAcrossSections(slug);

  if (!resolved) {
    notFound();
  }

  redirect(resolved.canonicalPath);
}

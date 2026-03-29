import { notFound, redirect } from 'next/navigation';
import { resolveAnnouncementParam } from '@/app/lib/public-content';

export function generateStaticParams() {
  return [];
}

export default async function AdmitCardAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveAnnouncementParam('admit-cards', slug);

  if (!resolved) {
    notFound();
  }

  redirect(resolved.canonicalPath);
}

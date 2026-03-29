import { notFound, redirect } from 'next/navigation';
import { resolveAnnouncementParam } from '@/app/lib/public-content';

export function generateStaticParams() {
  return [];
}

export default async function JobAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveAnnouncementParam('jobs', slug);

  if (!resolved) {
    notFound();
  }

  redirect(resolved.canonicalPath);
}

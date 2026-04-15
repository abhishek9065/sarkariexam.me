import { notFound, redirect } from 'next/navigation';
import { PublicCommunityPage } from '@/app/components/public-site/PublicCommunityPage';
import { getCommunityPageBySlug } from '@/app/lib/public-content';
import { loadCommunityPageMeta } from '@/lib/content-api';

export default async function JoinChannelPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  const fallback = getCommunityPageBySlug(channel) || undefined;
  const meta = await loadCommunityPageMeta(channel, fallback);

  if (!meta) {
    notFound();
  }

  if (meta.externalUrl) {
    redirect(meta.externalUrl);
  }

  return <PublicCommunityPage meta={meta} />;
}

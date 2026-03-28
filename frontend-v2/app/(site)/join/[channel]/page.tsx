import { notFound, redirect } from 'next/navigation';
import { PublicCommunityPage } from '@/app/components/public-site/PublicCommunityPage';
import { getCommunityPageBySlug } from '@/app/lib/public-content';

export default async function JoinChannelPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  const meta = getCommunityPageBySlug(channel);

  if (!meta) {
    notFound();
  }

  if (meta.externalUrl) {
    redirect(meta.externalUrl);
  }

  return <PublicCommunityPage meta={meta} />;
}

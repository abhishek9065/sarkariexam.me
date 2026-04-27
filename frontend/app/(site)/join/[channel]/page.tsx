import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PublicCommunityPage } from '@/app/components/public-site/PublicCommunityPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { getCommunityPageBySlug, normalizeExternalHref } from '@/app/lib/public-content';
import { buildNoIndexMetadata } from '@/app/lib/metadata';
import { breadcrumbJsonLd } from '@/app/lib/structured-data';
import { loadCommunityPageMeta } from '@/lib/content-api';

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel } = await params;
  const fallback = getCommunityPageBySlug(channel) || undefined;
  const meta = await loadCommunityPageMeta(channel, fallback);

  if (!meta) {
    notFound();
  }

  return buildNoIndexMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: meta.canonicalPath,
    keywords: [meta.channel, 'community updates', 'exam alerts', 'sarkari updates'],
  });
}

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

  const externalUrl = normalizeExternalHref(meta.externalUrl);
  if (externalUrl) {
    redirect(externalUrl);
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { label: 'Home', href: '/' },
        { label: 'Community', href: '/join/telegram' },
        { label: meta.title, href: meta.canonicalPath },
      ])} />
      <PublicCommunityPage meta={meta} />
    </>
  );
}

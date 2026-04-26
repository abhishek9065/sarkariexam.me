import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicStateDetailPage } from '@/app/components/public-site/PublicStateDetailPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildPageMetadata } from '@/app/lib/metadata';
import { breadcrumbJsonLd, collectionJsonLd } from '@/app/lib/structured-data';
import { getTaxonomyLanding, mapTaxonomyStateToMeta } from '@/lib/content-api';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const landing = await getTaxonomyLanding('states', slug);
    const state = mapTaxonomyStateToMeta(landing.taxonomy, landing.relatedCounts);
    return buildPageMetadata({
      title: state.title,
      description: state.description,
      canonicalPath: state.canonicalPath,
      keywords: [landing.taxonomy.name, 'state wise jobs', 'state government recruitment', 'regional exam updates'],
    });
  } catch {
    notFound();
  }
}

export default async function StateJobsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let state;
  let jobEntries;
  let resultEntries;
  let admitCardEntries;

  try {
    const { slug } = await params;
    const landing = await getTaxonomyLanding('states', slug);
    state = mapTaxonomyStateToMeta(landing.taxonomy, landing.relatedCounts);
    const toEntry = (item: typeof landing.cards[number]) => ({
      href: item.href,
      title: item.title,
      org: item.org,
      date: item.date,
      tag: item.tag,
      postCount: item.postCount,
      qualification: item.qualification,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    });
    jobEntries = landing.cards.filter((item) => item.type === 'job').slice(0, 6).map(toEntry);
    resultEntries = landing.cards.filter((item) => item.type === 'result').slice(0, 6).map(toEntry);
    admitCardEntries = landing.cards.filter((item) => item.type === 'admit-card').slice(0, 6).map(toEntry);
  } catch {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          ...collectionJsonLd(state, [...jobEntries, ...resultEntries, ...admitCardEntries]),
          breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: 'States', href: '/states' },
            { label: state.title, href: state.canonicalPath },
          ]),
        ]}
      />
      <PublicStateDetailPage
        state={state}
        jobEntries={jobEntries}
        resultEntries={resultEntries}
        admitCardEntries={admitCardEntries}
      />
    </>
  );
}

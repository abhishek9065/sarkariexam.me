import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildPageMetadata } from '@/app/lib/metadata';
import { breadcrumbJsonLd, collectionJsonLd } from '@/app/lib/structured-data';
import { buildOrganizationMeta, getTaxonomyLanding } from '@/lib/content-api';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const landing = await getTaxonomyLanding('organizations', slug);
    const meta = buildOrganizationMeta(landing.taxonomy.name);
    return buildPageMetadata({
      title: meta.title,
      description: meta.description,
      canonicalPath: `/organizations/${landing.taxonomy.slug}`,
      keywords: [landing.taxonomy.name, 'organization wise jobs', 'recruiting board updates', 'official notices'],
    });
  } catch {
    notFound();
  }
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let landing;
  let meta;

  try {
    const { slug } = await params;
    landing = await getTaxonomyLanding('organizations', slug);
    meta = buildOrganizationMeta(landing.taxonomy.name);
  } catch {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          ...collectionJsonLd({ ...meta, canonicalPath: `/organizations/${landing.taxonomy.slug}` }, landing.cards),
          breadcrumbJsonLd([
            { label: 'Home', href: '/' },
            { label: 'Organizations', href: '/organizations' },
            { label: landing.taxonomy.name, href: `/organizations/${landing.taxonomy.slug}` },
          ]),
        ]}
      />
      <PublicCategoryHubPage
        meta={{ ...meta, canonicalPath: `/organizations/${landing.taxonomy.slug}` }}
        entries={landing.cards.map((item) => ({
          href: item.href,
          title: item.title,
          org: item.org,
          date: item.date,
          tag: item.tag,
          postCount: item.postCount,
          qualification: item.qualification,
          publishedAt: item.publishedAt,
          updatedAt: item.updatedAt,
        }))}
        querySummary={`Showing official updates from ${landing.taxonomy.name}.`}
        clearHref={`/organizations/${landing.taxonomy.slug}`}
      />
    </>
  );
}

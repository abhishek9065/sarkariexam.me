import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { PublicInfoPage } from '@/app/components/public-site/PublicInfoPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import {
  getCategoryMetaBySlug,
  getInfoPageBySlug,
  infoPageMeta,
  resourceCategoryMeta,
} from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { breadcrumbJsonLd, collectionJsonLd } from '@/app/lib/structured-data';
import { loadInfoPageMeta, loadResourceCategoryMeta } from '@/lib/content-api';

const topLevelSlugs = [
  'syllabus',
  'board-results',
  'scholarship',
  ...Object.keys(infoPageMeta),
];

export function generateStaticParams() {
  return topLevelSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const infoPage = await loadInfoPageMeta(slug, getInfoPageBySlug(slug) || undefined);
  if (infoPage) {
    return buildPageMetadata({
      title: infoPage.title,
      description: infoPage.description,
      canonicalPath: infoPage.canonicalPath,
      keywords: [infoPage.slug, infoPage.eyebrow],
    });
  }

  const categoryMeta = getCategoryMetaBySlug(slug);
  if (!categoryMeta) {
    notFound();
  }

  return buildPageMetadata({
    title: categoryMeta.title,
    description: categoryMeta.description,
    canonicalPath: categoryMeta.canonicalPath,
    keywords: [categoryMeta.title, categoryMeta.eyebrow],
  });
}

export default async function PublicSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const infoPage = await loadInfoPageMeta(slug, getInfoPageBySlug(slug) || undefined);
  if (infoPage) {
    return (
      <>
        <JsonLd data={breadcrumbJsonLd([
          { label: 'Home', href: '/' },
          { label: infoPage.title, href: infoPage.canonicalPath },
        ])} />
        <PublicInfoPage meta={infoPage} />
      </>
    );
  }

  const categoryMeta = getCategoryMetaBySlug(slug);
  if (!categoryMeta) {
    notFound();
  }

  if (slug in resourceCategoryMeta) {
    const resourceSlug = slug as keyof typeof resourceCategoryMeta;
    const resourceMeta = await loadResourceCategoryMeta(slug, resourceCategoryMeta[resourceSlug]);
    if (!resourceMeta) {
      notFound();
    }

    return (
      <>
        <JsonLd data={collectionJsonLd(resourceMeta, resourceMeta.resourceCards.map((card) => ({
          date: '',
          href: card.href,
          org: 'SarkariExams.me',
          title: card.label,
        })))} />
        <PublicCategoryHubPage
          meta={resourceMeta}
          entries={[]}
          resourceCards={resourceMeta.resourceCards}
        />
      </>
    );
  }

  notFound();
}

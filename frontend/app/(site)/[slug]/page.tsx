import { notFound } from 'next/navigation';
import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { PublicInfoPage } from '@/app/components/public-site/PublicInfoPage';
import {
  getCategoryMetaBySlug,
  getInfoPageBySlug,
  infoPageMeta,
  resourceCategoryMeta,
} from '@/app/lib/public-content';
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

export default async function PublicSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const infoPage = await loadInfoPageMeta(slug, getInfoPageBySlug(slug) || undefined);
  if (infoPage) {
    return <PublicInfoPage meta={infoPage} />;
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
      <PublicCategoryHubPage
        meta={resourceMeta}
        entries={[]}
        resourceCards={resourceMeta.resourceCards}
      />
    );
  }

  notFound();
}

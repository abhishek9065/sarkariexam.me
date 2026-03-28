import { notFound } from 'next/navigation';
import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { PublicInfoPage } from '@/app/components/public-site/PublicInfoPage';
import {
  getCategoryMetaBySlug,
  getInfoPageBySlug,
  getResourceCardsBySlug,
  infoPageMeta,
  resourceCategoryMeta,
} from '@/app/lib/public-content';

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

  const infoPage = getInfoPageBySlug(slug);
  if (infoPage) {
    return <PublicInfoPage meta={infoPage} />;
  }

  const categoryMeta = getCategoryMetaBySlug(slug);
  if (!categoryMeta) {
    notFound();
  }

  if (slug in resourceCategoryMeta) {
    const resourceSlug = slug as keyof typeof resourceCategoryMeta;
    return (
      <PublicCategoryHubPage
        meta={categoryMeta}
        entries={[]}
        resourceCards={getResourceCardsBySlug(resourceSlug)}
      />
    );
  }

  notFound();
}

import type { Metadata } from 'next';

import { PublicStateDirectoryPage } from '@/app/components/public-site/PublicStateDirectoryPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { getCategoryMetaBySlug } from '@/app/lib/public-content';
import { buildPageMetadata } from '@/app/lib/metadata';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { getTaxonomyList } from '@/lib/content-api';

export const metadata: Metadata = buildPageMetadata({
  title: 'State Wise Government Jobs and Exam Updates',
  description:
    'Browse state-wise government jobs, results, admit cards, and admissions to quickly find local recruitment and exam updates.',
  canonicalPath: '/states',
  keywords: ['state wise jobs', 'state government recruitment', 'regional exam updates'],
});


export default async function StatesPage() {
  const meta = getCategoryMetaBySlug('states');
  const states = await getTaxonomyList('states').catch(() => []);

  if (!meta) {
    return null;
  }

  const entries = states.map((state) => ({
    slug: state.slug,
    title: state.name,
    description: `Government jobs, results, admit cards, and admissions for ${state.name}.`,
    count: 0,
  }));

  return (
    <>
      <JsonLd data={collectionJsonLd(meta, entries.map((entry) => ({
        date: '',
        href: `/states/${entry.slug}`,
        org: 'SarkariExams.me',
        title: entry.title,
      })))} />
    <PublicStateDirectoryPage
      meta={meta}
      entries={entries}
    />
    </>
  );
}

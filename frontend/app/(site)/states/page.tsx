import { PublicStateDirectoryPage } from '@/app/components/public-site/PublicStateDirectoryPage';
import { getCategoryMetaBySlug } from '@/app/lib/public-content';
import { getTaxonomyList } from '@/lib/content-api';


export default async function StatesPage() {
  const meta = getCategoryMetaBySlug('states');
  const states = await getTaxonomyList('states').catch(() => []);

  if (!meta) {
    return null;
  }

  return (
    <PublicStateDirectoryPage
      meta={meta}
      entries={states.map((state) => ({
        slug: state.slug,
        title: state.name,
        description: `Government jobs, results, admit cards, and admissions for ${state.name}.`,
        count: 0,
      }))}
    />
  );
}

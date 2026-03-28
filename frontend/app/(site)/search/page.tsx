import { PublicSearchPage } from '@/app/components/public-site/PublicSearchPage';
import { getSearchResults } from '@/app/lib/public-content';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return <PublicSearchPage query={query} results={query ? getSearchResults(query) : []} />;
}

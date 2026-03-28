import { PublicStateDirectoryPage } from '@/app/components/public-site/PublicStateDirectoryPage';
import { getCategoryMetaBySlug, getStateDirectoryEntries } from '@/app/lib/public-content';

export default function StatesPage() {
  const meta = getCategoryMetaBySlug('states');

  if (!meta) {
    return null;
  }

  return <PublicStateDirectoryPage meta={meta} entries={getStateDirectoryEntries()} />;
}

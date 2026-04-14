import { PublicStateDirectoryPage } from '@/app/components/public-site/PublicStateDirectoryPage';
import { buildOrganizationMeta, getTaxonomyList } from '@/lib/content-api';


export default async function OrganizationsPage() {
  const organizations = await getTaxonomyList('organizations');

  return (
    <PublicStateDirectoryPage
      meta={buildOrganizationMeta('Organizations')}
      entries={organizations.map((organization) => ({
        slug: organization.slug,
        title: organization.name,
        description: `Officially sourced updates from ${organization.name}.`,
        count: 0,
      }))}
    />
  );
}

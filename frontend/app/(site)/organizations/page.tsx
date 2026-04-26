import type { Metadata } from 'next';

import { PublicStateDirectoryPage } from '@/app/components/public-site/PublicStateDirectoryPage';
import { JsonLd } from '@/app/components/seo/JsonLd';
import { buildPageMetadata } from '@/app/lib/metadata';
import { collectionJsonLd } from '@/app/lib/structured-data';
import { buildOrganizationMeta, getTaxonomyList } from '@/lib/content-api';

export const metadata: Metadata = buildPageMetadata({
  title: 'Organization Wise Recruitment and Exam Notices',
  description:
    'Explore official updates by recruiting organization, board, and institution to track notices from your target authority.',
  canonicalPath: '/organizations',
  keywords: ['organization wise jobs', 'recruiting board updates', 'official notices'],
});


export default async function OrganizationsPage() {
  const organizations = await getTaxonomyList('organizations').catch(() => []);

  const meta = buildOrganizationMeta('Organizations');
  const entries = organizations.map((organization) => ({
    slug: organization.slug,
    title: organization.name,
    description: `Officially sourced updates from ${organization.name}.`,
    count: 0,
  }));

  return (
    <>
      <JsonLd data={collectionJsonLd(meta, entries.map((entry) => ({
        date: '',
        href: `/organizations/${entry.slug}`,
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

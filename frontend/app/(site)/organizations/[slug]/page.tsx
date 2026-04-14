import { notFound } from 'next/navigation';
import { PublicCategoryHubPage } from '@/app/components/public-site/PublicCategoryHubPage';
import { buildOrganizationMeta, getTaxonomyLanding } from '@/lib/content-api';


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
      }))}
      querySummary={`Showing official updates from ${landing.taxonomy.name}.`}
      clearHref={`/organizations/${landing.taxonomy.slug}`}
    />
  );
}

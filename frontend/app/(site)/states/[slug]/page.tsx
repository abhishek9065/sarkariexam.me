import { notFound } from 'next/navigation';
import { PublicStateDetailPage } from '@/app/components/public-site/PublicStateDetailPage';
import { getTaxonomyLanding, mapTaxonomyStateToMeta } from '@/lib/content-api';


export default async function StateJobsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let state;
  let jobEntries;
  let resultEntries;
  let admitCardEntries;

  try {
    const { slug } = await params;
    const landing = await getTaxonomyLanding('states', slug);
    state = mapTaxonomyStateToMeta(landing.taxonomy, landing.relatedCounts);
    const toEntry = (item: typeof landing.cards[number]) => ({
      href: item.href,
      title: item.title,
      org: item.org,
      date: item.date,
      tag: item.tag,
      postCount: item.postCount,
      qualification: item.qualification,
    });
    jobEntries = landing.cards.filter((item) => item.type === 'job').slice(0, 6).map(toEntry);
    resultEntries = landing.cards.filter((item) => item.type === 'result').slice(0, 6).map(toEntry);
    admitCardEntries = landing.cards.filter((item) => item.type === 'admit-card').slice(0, 6).map(toEntry);
  } catch {
    notFound();
  }

  return (
    <PublicStateDetailPage
      state={state}
      jobEntries={jobEntries}
      resultEntries={resultEntries}
      admitCardEntries={admitCardEntries}
    />
  );
}

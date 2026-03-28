import { notFound } from 'next/navigation';
import { PublicStateDetailPage } from '@/app/components/public-site/PublicStateDetailPage';
import {
  getStateAnnouncements,
  getStateMeta,
  statePageMeta,
  toPortalEntry,
} from '@/app/lib/public-content';

export function generateStaticParams() {
  return statePageMeta.map((state) => ({ slug: state.slug }));
}

export default async function StateJobsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = getStateMeta(slug);

  if (!state) {
    notFound();
  }

  return (
    <PublicStateDetailPage
      state={state}
      jobEntries={getStateAnnouncements(slug, 'jobs').slice(0, 6).map(toPortalEntry)}
      resultEntries={getStateAnnouncements(slug, 'results').slice(0, 6).map(toPortalEntry)}
      admitCardEntries={getStateAnnouncements(slug, 'admit-cards').slice(0, 6).map(toPortalEntry)}
    />
  );
}

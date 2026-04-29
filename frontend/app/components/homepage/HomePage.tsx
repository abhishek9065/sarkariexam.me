import { HomePageHero } from './HomePageHero';
import { HomePageLatestUpdates } from './HomePageLatestUpdates';
import { HomePageQuickLinks } from './HomePageQuickLinks';
import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';
import { getHomepageSections } from '@/lib/content-api';

type HomepageSections = Awaited<ReturnType<typeof getHomepageSections>>;
type HomepageSectionItem = HomepageSections[keyof HomepageSections][number];

function normalizePostCountText(value?: string) {
  return value?.replace(/\s+posts?$/i, '').trim();
}

function toLatestUpdateItem(item: HomepageSectionItem) {
  return {
    href: item.href,
    title: item.title,
    org: item.org,
    date: item.date,
    tag: item.tag,
    postCount: normalizePostCountText(item.postCount),
    qualification: item.qualification,
  };
}

export default async function HomePage() {
  const sections = await getHomepageSections();

  return (
    <PublicSiteShell>
      <HomePageHero />
      <HomePageLatestUpdates
        sections={{
          results: sections.results?.map(toLatestUpdateItem),
          'admit-cards': sections['admit-cards']?.map(toLatestUpdateItem),
          jobs: sections.jobs?.map(toLatestUpdateItem),
          'answer-keys': sections['answer-keys']?.map(toLatestUpdateItem),
          admissions: sections.admissions?.map(toLatestUpdateItem),
        }}
      />
      <HomePageQuickLinks />
    </PublicSiteShell>
  );
}

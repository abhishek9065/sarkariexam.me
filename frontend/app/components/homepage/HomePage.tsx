import { HomePageHero } from './HomePageHero';
import { HomePageLatestUpdates } from './HomePageLatestUpdates';
import { HomePageQuickLinks } from './HomePageQuickLinks';
import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';
import { getHomepageSections } from '@/lib/content-api';

export default async function HomePage() {
  const sections = await getHomepageSections();

  return (
    <PublicSiteShell>
      <HomePageHero />
      <HomePageLatestUpdates
        sections={{
          results: sections.results?.map((item) => ({
            href: item.href,
            title: item.title,
            org: item.org,
            date: item.date,
            tag: item.tag,
            postCount: item.postCount,
            qualification: item.qualification,
          })),
          'admit-cards': sections['admit-cards']?.map((item) => ({
            href: item.href,
            title: item.title,
            org: item.org,
            date: item.date,
            tag: item.tag,
            postCount: item.postCount,
            qualification: item.qualification,
          })),
          jobs: sections.jobs?.map((item) => ({
            href: item.href,
            title: item.title,
            org: item.org,
            date: item.date,
            tag: item.tag,
            postCount: item.postCount,
            qualification: item.qualification,
          })),
          'answer-keys': sections['answer-keys']?.map((item) => ({
            href: item.href,
            title: item.title,
            org: item.org,
            date: item.date,
            tag: item.tag,
            postCount: item.postCount,
            qualification: item.qualification,
          })),
          admissions: sections.admissions?.map((item) => ({
            href: item.href,
            title: item.title,
            org: item.org,
            date: item.date,
            tag: item.tag,
            postCount: item.postCount,
            qualification: item.qualification,
          })),
        }}
      />
      <HomePageQuickLinks />
    </PublicSiteShell>
  );
}

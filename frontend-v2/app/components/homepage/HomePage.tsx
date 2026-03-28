import { HomePageHero } from './HomePageHero';
import { HomePageLatestUpdates } from './HomePageLatestUpdates';
import { HomePageQuickLinks } from './HomePageQuickLinks';
import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';

export default function HomePage() {
  return (
    <PublicSiteShell>
      <HomePageHero />
      <HomePageLatestUpdates />
      <HomePageQuickLinks />
    </PublicSiteShell>
  );
}

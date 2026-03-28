import { HomePageFooter } from './HomePageFooter';
import { HomePageHero } from './HomePageHero';
import { HomePageLatestUpdates } from './HomePageLatestUpdates';
import { HomePageMarqueeTicker } from './HomePageMarqueeTicker';
import { HomePageNavbar } from './HomePageNavbar';
import { HomePageQuickLinks } from './HomePageQuickLinks';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f0f2f7] text-gray-900 font-[family-name:var(--font-inter)]">
      <HomePageNavbar />
      <HomePageMarqueeTicker />
      <HomePageHero />
      <HomePageLatestUpdates />
      <HomePageQuickLinks />
      <HomePageFooter />
    </div>
  );
}

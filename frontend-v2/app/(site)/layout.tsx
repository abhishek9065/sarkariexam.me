import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}

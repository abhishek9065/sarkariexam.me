import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen py-6">
        <div className="max-w-6xl mx-auto px-4">
          {children}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}

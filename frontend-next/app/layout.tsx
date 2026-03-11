import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "@/app/components/HomePage.css";
import "@/app/components/DetailPage.css";
import "@/app/components/CategoryPage.css";
import "@/app/components/MobileBottomNav.css";
import { Providers } from "./providers";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { MobileBottomNav } from "@/app/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "SarkariExams.me — Sarkari Results, Admit Cards & Latest Government Jobs",
  description: "India's fastest, most reliable source for Sarkari Results, Admit Cards, and Latest Government Jobs across India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="app">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Suspense>
              <Header />
            </Suspense>
            <main id="main-content" className="main-content container animate-fade-in">
              <Suspense>
                {children}
              </Suspense>
            </main>
            <Footer />
            <MobileBottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}


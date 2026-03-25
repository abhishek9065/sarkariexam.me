import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "@/app/components/HomePage.css";
import "@/app/components/DetailPage.css";
import "@/app/components/CategoryPage.css";
import "@/app/components/MobileBottomNav.css";
import { Providers } from "./providers";
import { AppChrome } from "@/app/components/AppChrome";

export const metadata: Metadata = {
  title: "SarkariExams.me — Sarkari Results, Admit Cards & Latest Government Jobs",
  description: "India's fastest, most reliable source for Sarkari Results, Admit Cards, and Latest Government Jobs across India.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppChrome pathname={pathname}>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}

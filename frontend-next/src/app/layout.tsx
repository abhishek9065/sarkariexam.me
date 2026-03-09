import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import AuthModal from "@/components/AuthModal";
import { GlobalProviders } from "@/context";

export const metadata: Metadata = {
  title: "SarkariExams.me - Latest Government Jobs, Results, Admit Cards",
  description: "Find the latest government jobs, exam results, admit cards, answer keys, and syllabus on SarkariExams.me",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GlobalProviders>
          <div className="app-container">
            <Header />
            <main className="main-content">
              {children}
            </main>
            <Footer />
            <MobileBottomNav />
            <AuthModal />
          </div>
        </GlobalProviders>
      </body>
    </html>
  );
}

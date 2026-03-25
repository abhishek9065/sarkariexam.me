import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SarkariExams.me | Sarkari Results, Admit Cards, Government Jobs",
  description: "Trust-first command center for Sarkari Results, Admit Cards, latest government jobs, admissions, and exam updates across India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

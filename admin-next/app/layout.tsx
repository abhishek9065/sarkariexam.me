import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Inter, Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Admin Console | SarkariExams.me',
  description: 'Admin console for managing SarkariExams.me',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-snippet': 0,
      'max-image-preview': 'none',
      'max-video-preview': 0,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable, poppins.variable)}>
      <body className="min-h-screen bg-admin-shell antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

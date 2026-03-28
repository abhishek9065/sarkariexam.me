import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Poppins } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: { template: '%s | SarkariExams.me', default: 'SarkariExams.me — Sarkari Result, Jobs, Admit Card 2025' },
  description: 'Get latest Sarkari Result, Government Jobs, Admit Card, Answer Key, Syllabus and Admission updates for 2025.',
  keywords: 'sarkari result, sarkari naukri, government jobs, admit card, answer key, syllabus',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} font-sans`}>
        <ThemeProvider>
          <PwaRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PwaRegister } from '@/components/PwaRegister';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { template: '%s | SarkariExams.me', default: 'SarkariExams.me — Sarkari Result, Jobs, Admit Card 2025' },
  description: 'Get latest Sarkari Result, Government Jobs, Admit Card, Answer Key, Syllabus and Admission updates for 2025.',
  keywords: 'sarkari result, sarkari naukri, government jobs, admit card, answer key, syllabus',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <PwaRegister />
        <Header />
        <main className="min-h-screen py-6">
          <div className="max-w-6xl mx-auto px-4">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}

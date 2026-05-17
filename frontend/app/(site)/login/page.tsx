import type { Metadata } from 'next';

import HomePage from '@/app/components/homepage/HomePage';
import { buildPageMetadata } from '@/app/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sign in to SarkariExams.me',
  description: 'Open the public sign-in modal for SarkariExams.me and continue to jobs, results, admit cards, and alerts.',
  canonicalPath: '/login',
  keywords: ['login', 'sign in', 'government jobs alerts'],
  noindex: true,
});

export default function LoginPage() {
  return <HomePage initialAuthTab="login" />;
}
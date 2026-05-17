import type { Metadata } from 'next';

import HomePage from '@/app/components/homepage/HomePage';
import { buildPageMetadata } from '@/app/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create an account on SarkariExams.me',
  description: 'Open the public registration modal for SarkariExams.me and save jobs, results, and alerts.',
  canonicalPath: '/register',
  keywords: ['register', 'sign up', 'save jobs'],
  noindex: true,
});

export default function RegisterPage() {
  return <HomePage initialAuthTab="register" />;
}
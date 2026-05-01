import type { Metadata } from 'next';

import { JsonLd } from '@/app/components/seo/JsonLd';
import HomePage from '@/app/components/homepage/HomePage';
import { buildPageMetadata } from '@/app/lib/metadata';
import { organizationJsonLd, websiteJsonLd } from '@/app/lib/structured-data';

export const metadata: Metadata = buildPageMetadata({
  title: 'Government Jobs, Results, Admit Cards, Answer Keys',
  description:
    'SarkariExams.me brings official government job forms, exam results, admit cards, answer keys, syllabus, admissions, and important updates in one place.',
  canonicalPath: '/',
  keywords: ['latest government jobs', 'sarkari result today', 'online form', 'exam notifications'],
});

export const revalidate = 300;

export default function Page() {
  return (
    <>
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      <HomePage />
    </>
  );
}

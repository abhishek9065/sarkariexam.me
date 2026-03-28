import Link from 'next/link';
import { notFound } from 'next/navigation';

const categoryPages = {
  'answer-keys': {
    title: 'Answer Keys',
    accent: 'bg-[#00695c]',
    description: 'Official answer keys, objections, response sheets, and exam-wise marking updates.',
    highlights: ['SSC CGL Tier I Key', 'CTET Response Sheet', 'UPSC CAPF Key', 'NTA UGC NET Key'],
  },
  syllabus: {
    title: 'Syllabus',
    accent: 'bg-[#6a1b9a]',
    description: 'Latest exam pattern, selection process, syllabus PDF, and subject-wise topic breakdowns.',
    highlights: ['SSC CGL Syllabus', 'UP Police Pattern', 'Railway Group D Topics', 'CTET Subject Guide'],
  },
  admissions: {
    title: 'Admissions',
    accent: 'bg-[#ad1457]',
    description: 'University and entrance admissions with dates, eligibility, counseling, and registration links.',
    highlights: ['DU UG Admission', 'NEET UG Registration', 'JEE Advanced', 'IGNOU July Session'],
  },
  'board-results': {
    title: 'Board Results',
    accent: 'bg-[#1565c0]',
    description: 'Board exam result updates, score card links, topper lists, and compartment notices.',
    highlights: ['CBSE Class 10', 'CBSE Class 12', 'UP Board', 'Bihar Board'],
  },
  scholarship: {
    title: 'Scholarship',
    accent: 'bg-[#e65100]',
    description: 'Central and state scholarship forms, renewal notices, eligibility, and payment status updates.',
    highlights: ['UP Scholarship', 'NSP Scholarship', 'Bihar Scholarship', 'Minority Schemes'],
  },
  bookmarks: {
    title: 'Bookmarks',
    accent: 'bg-[#283593]',
    description: 'Saved announcements, quick revisit lists, and recently viewed job or result links.',
    highlights: ['Saved Jobs', 'Saved Results', 'Important Links', 'Recent Activity'],
  },
  profile: {
    title: 'Profile',
    accent: 'bg-[#37474f]',
    description: 'Manage your account preferences, alerts, subscriptions, and saved categories.',
    highlights: ['Email Alerts', 'Telegram Alerts', 'Saved Searches', 'Account Settings'],
  },
  about: {
    title: 'About SarkariExams.me',
    accent: 'bg-[#1a237e]',
    description: 'Platform overview, update policy, editorial process, and public information standards.',
    highlights: ['Update Cycle', 'Verification Process', 'Coverage Scope', 'Public Service Focus'],
  },
  contact: {
    title: 'Contact Us',
    accent: 'bg-[#d84315]',
    description: 'Reach the editorial desk for corrections, advertising, or support requests.',
    highlights: ['Editorial Support', 'Corrections', 'Advertising', 'General Queries'],
  },
  privacy: {
    title: 'Privacy Policy',
    accent: 'bg-[#4e342e]',
    description: 'Information handling, cookies, analytics, and user communication preferences.',
    highlights: ['Cookies', 'Analytics', 'Email Notifications', 'Data Retention'],
  },
  disclaimer: {
    title: 'Disclaimer',
    accent: 'bg-[#455a64]',
    description: 'Usage limitations, source references, and non-affiliation with government agencies.',
    highlights: ['Public Sources', 'No Affiliation', 'Accuracy Scope', 'User Responsibility'],
  },
  advertise: {
    title: 'Advertise',
    accent: 'bg-[#bf360c]',
    description: 'Brand collaboration, sponsored placements, and campaign support for public audiences.',
    highlights: ['Banner Placement', 'Campaign Reach', 'Audience Profile', 'Contact Desk'],
  },
} as const;

export function generateStaticParams() {
  return Object.keys(categoryPages).map((slug) => ({ slug }));
}

function toLabel(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function CategoryPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = categoryPages[slug as keyof typeof categoryPages];

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      <section className={`${page.accent} rounded-2xl px-6 py-8 text-white shadow-sm`}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">Public Category</p>
        <h1 className="text-3xl font-extrabold">{page.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">{page.description}</p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className={`${page.accent} px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white`}>
            Latest Updates In {page.title}
          </div>
          <div className="divide-y divide-gray-100">
            {page.highlights.map((highlight, index) => (
              <div key={highlight} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{highlight}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Detailed public page for {toLabel(slug)} is being prepared with a denser announcement layout.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-gray-400">{28 - index} Mar 2026</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className={`${page.accent} px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white`}>
              Quick Access
            </div>
            <div className="p-4">
              <div className="grid gap-2">
                <Link href="/jobs" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                  Latest Jobs
                </Link>
                <Link href="/results" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                  Latest Results
                </Link>
                <Link href="/admit-cards" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                  Admit Cards
                </Link>
                <Link href="/" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                  Back to Homepage
                </Link>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#37474f] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">Status</div>
            <div className="space-y-3 p-4 text-sm text-gray-600">
              <p>The route is now active in production instead of returning a missing-page error.</p>
              <p>The detailed long-form category implementation can be expanded later without breaking navigation.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

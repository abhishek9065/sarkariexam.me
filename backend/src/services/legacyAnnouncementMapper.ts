import type { PostWorkflowStatus } from '../content/types.js';
import type { Announcement, ContentType } from '../types.js';
import { slugify } from '../utils/slugify.js';

export interface LegacyMappedPostInput {
  legacyAnnouncementId?: string;
  legacyId?: string;
  title: string;
  slug?: string;
  legacySlugs: string[];
  type: ContentType;
  status: PostWorkflowStatus;
  summary: string;
  shortInfo?: string;
  body?: string;
  organization?: { name: string; slug: string } | null;
  categories: Array<{ name: string; slug: string }>;
  states: Array<{ name: string; slug: string }>;
  qualifications: Array<{ name: string; slug: string }>;
  institution?: { name: string; slug: string } | null;
  exam?: { name: string; slug: string } | null;
  importantDates: Array<{ label: string; value: string; kind?: 'application_start' | 'last_date' | 'exam_date' | 'result_date' | 'admit_card' | 'counselling' | 'other' }>;
  eligibility: Array<{ label: string; description: string }>;
  feeRules: Array<{ category: string; amount: string; currency?: string; paymentNote?: string }>;
  vacancyRows: Array<{ postName: string; department?: string; vacancies: string; payLevel?: string; salaryNote?: string }>;
  admissionPrograms: Array<{ programName: string; level?: string; department?: string; intake?: string; eligibilityNote?: string }>;
  officialSources: Array<{ label: string; url: string; sourceType?: 'notification' | 'result' | 'admit-card' | 'website' | 'prospectus' | 'notice'; isPrimary?: boolean }>;
  verificationNote?: string;
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  flags: { urgent?: boolean; isNew?: boolean; lastDate?: boolean; featured?: boolean };
  home: { section?: string; stickyRank?: number; highlight?: boolean; trendingScore?: number };
  location?: string;
  salary?: string;
  postCount?: string;
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  resultDate?: string;
  expiresAt?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalPath?: string;
    indexable?: boolean;
    ogImage?: string;
  };
}

function stripHtml(value?: string) {
  return value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function summarize(value?: string) {
  const clean = stripHtml(value);
  return clean.slice(0, 260) || 'Official government opportunity update. Check important dates, eligibility, source links, and latest status.';
}

function mapAnnouncementStatusToPostStatus(status?: Announcement['status']): PostWorkflowStatus {
  switch (status) {
    case 'pending':
      return 'in_review';
    case 'scheduled':
      return 'approved';
    case 'archived':
      return 'archived';
    case 'published':
      return 'published';
    case 'draft':
    default:
      return 'draft';
  }
}

function mapTag(value?: unknown): 'new' | 'hot' | 'update' | 'last-date' | undefined {
  const raw = String(value || '').toLowerCase();
  if (raw === 'new' || raw === 'hot' || raw === 'update' || raw === 'last-date') return raw;
  return undefined;
}

function toStringDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isAllIndiaLocation(value?: string) {
  if (!value?.trim()) return false;
  return /\ball\s*india\b/i.test(value) || /\bnational\b/i.test(value);
}

function maybeState(value?: string) {
  if (!value?.trim()) return [];
  const normalized = value.trim();
  if (isAllIndiaLocation(normalized)) return [];

  const parts = normalized
    .split(/[|,/;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = new Map<string, { name: string; slug: string }>();
  for (const part of parts) {
    const slug = slugify(part);
    if (!slug) continue;
    unique.set(slug, { name: part, slug });
  }
  return Array.from(unique.values());
}

function buildVerificationNote(params: {
  explicitNote?: string;
  title: string;
  officialSources: Array<{ label: string; url: string }>;
}) {
  const explicit = params.explicitNote?.trim();
  if (explicit) return explicit;
  if (params.officialSources.length > 0) {
    return `Legacy import for "${params.title}". Official source link attached from the prior system. Editorial verification is still recommended before republishing.`;
  }
  return 'Legacy import from the prior system. Official source verification is still pending editorial review.';
}

export function mapAnnouncementToPostInput(announcement: Announcement): LegacyMappedPostInput {
  const job = (announcement.jobDetails || {}) as Record<string, any>;
  const applicationFee = (job.applicationFee || {}) as Record<string, string>;
  const eligibility = (job.eligibility || {}) as Record<string, string>;
  const officialSources = announcement.externalLink
    ? [{ label: 'Official Source', url: announcement.externalLink, sourceType: 'website' as const, isPrimary: true }]
    : [];

  const importantDates: LegacyMappedPostInput['importantDates'] = [
    ...(announcement.importantDates || []).map((item) => ({
      label: item.eventName,
      value: toStringDate(item.eventDate),
      kind: 'other' as const,
    })),
  ];
  if (job.applicationStartDate) {
    importantDates.unshift({ label: 'Application Start', value: String(job.applicationStartDate), kind: 'application_start' });
  }
  if (announcement.deadline) {
    importantDates.push({ label: 'Last Date', value: toStringDate(announcement.deadline), kind: 'last_date' });
  }
  if (job.examDate) {
    importantDates.push({ label: 'Exam Date', value: String(job.examDate), kind: 'exam_date' });
  }

  const feeRules: LegacyMappedPostInput['feeRules'] = Object.entries(applicationFee).map(([category, amount]) => ({
    category: category.toUpperCase(),
    amount: String(amount),
    currency: 'INR',
    paymentNote: announcement.applicationFee || String(job.applicationFeeNote || ''),
  }));
  if (!feeRules.length && announcement.applicationFee) {
    feeRules.push({
      category: 'GENERAL',
      amount: announcement.applicationFee,
      currency: 'INR',
      paymentNote: announcement.applicationFee,
    });
  }

  const eligibilityRows = [
    ...(announcement.minQualification ? [{ label: 'Qualification', description: announcement.minQualification }] : []),
    ...(announcement.ageLimit ? [{ label: 'Age Limit', description: announcement.ageLimit }] : []),
    ...(eligibility.education ? [{ label: 'Education', description: eligibility.education }] : []),
    ...(eligibility.age ? [{ label: 'Age', description: eligibility.age }] : []),
    ...(eligibility.nationality ? [{ label: 'Nationality', description: eligibility.nationality }] : []),
  ];

  const vacancyRows = Array.isArray(job.vacancyBreakdown)
    ? job.vacancyBreakdown.map((row: Record<string, unknown>) => ({
        postName: String(row.post || announcement.title),
        department: row.dept ? String(row.dept) : undefined,
        vacancies: String(row.vacancies || announcement.totalPosts || ''),
        payLevel: row.payLevel ? String(row.payLevel) : undefined,
        salaryNote: row.salary ? String(row.salary) : undefined,
      }))
    : [];

  return {
    legacyAnnouncementId: announcement.id,
    legacyId: announcement.id,
    title: announcement.title,
    slug: announcement.slug,
    legacySlugs: [],
    type: announcement.type,
    status: mapAnnouncementStatusToPostStatus(announcement.status),
    summary: summarize(announcement.content),
    shortInfo: summarize(job.description || announcement.content),
    body: announcement.content,
    organization: announcement.organization ? { name: announcement.organization, slug: slugify(announcement.organization) } : null,
    categories: [{ name: announcement.category || announcement.type, slug: slugify(announcement.category || announcement.type) }],
    states: maybeState(announcement.location),
    qualifications: announcement.minQualification ? [{ name: announcement.minQualification, slug: slugify(announcement.minQualification) }] : [],
    institution: announcement.type === 'admission' && announcement.organization
      ? { name: announcement.organization, slug: slugify(announcement.organization) }
      : null,
    exam: job.orgShort ? { name: String(job.orgShort), slug: slugify(String(job.orgShort)) } : null,
    importantDates,
    eligibility: eligibilityRows,
    feeRules,
    vacancyRows,
    admissionPrograms: Array.isArray(job.programs)
      ? job.programs.map((program: Record<string, unknown>) => ({
          programName: String(program.name || announcement.title),
          level: program.level ? String(program.level) : undefined,
          department: program.department ? String(program.department) : undefined,
          intake: program.intake ? String(program.intake) : undefined,
          eligibilityNote: program.eligibility ? String(program.eligibility) : undefined,
        }))
      : [],
    officialSources,
    verificationNote: buildVerificationNote({
      explicitNote: String(job.sourceNote || ''),
      title: announcement.title,
      officialSources,
    }),
    tag: mapTag(job.tag || announcement.tags?.[0]?.slug),
    flags: {
      urgent: Boolean(announcement.home?.highlight),
      isNew: mapTag(job.tag) === 'new',
      lastDate: mapTag(job.tag) === 'last-date',
      featured: Boolean(announcement.home?.highlight),
    },
    home: {
      section: announcement.home?.section,
      stickyRank: announcement.home?.stickyRank,
      highlight: announcement.home?.highlight,
      trendingScore: announcement.home?.trendingScore,
    },
    location: announcement.location || undefined,
    salary: typeof job.salary === 'string'
      ? job.salary
      : announcement.salaryMin || announcement.salaryMax
        ? `${announcement.salaryMin || ''}${announcement.salaryMin && announcement.salaryMax ? ' - ' : ''}${announcement.salaryMax || ''}`
        : undefined,
    postCount: announcement.totalPosts ? String(announcement.totalPosts) : undefined,
    applicationStartDate: job.applicationStartDate ? String(job.applicationStartDate) : undefined,
    lastDate: announcement.deadline ? toStringDate(announcement.deadline) : undefined,
    examDate: job.examDate ? String(job.examDate) : undefined,
    resultDate: announcement.type === 'result' ? toStringDate(announcement.updatedAt) : undefined,
    expiresAt: announcement.deadline ? toStringDate(announcement.deadline) : undefined,
    seo: {
      metaTitle: announcement.seo?.metaTitle,
      metaDescription: announcement.seo?.metaDescription,
      canonicalPath: announcement.seo?.canonical,
      indexable: announcement.seo?.indexPolicy !== 'noindex',
      ogImage: announcement.seo?.ogImage,
    },
  };
}

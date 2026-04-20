import { z } from 'zod';

export const postTypeValues = ['job', 'result', 'admit-card', 'admission', 'answer-key', 'syllabus'] as const;
export type PostType = (typeof postTypeValues)[number];

export const workflowStatusValues = ['draft', 'in_review', 'approved', 'published', 'archived'] as const;
export type PostWorkflowStatus = (typeof workflowStatusValues)[number];

export const editorialRoleValues = ['editor', 'reviewer', 'admin', 'superadmin'] as const;
export type EditorialRole = (typeof editorialRoleValues)[number];

export const trustBadgeValues = ['urgent', 'new', 'last-date', 'verified'] as const;
export type TrustBadge = (typeof trustBadgeValues)[number];

export interface TaxonomyRef {
  id?: string;
  name: string;
  slug: string;
}

export interface OfficialSource {
  label: string;
  url: string;
  sourceType?: 'notification' | 'result' | 'admit-card' | 'website' | 'prospectus' | 'notice';
  isPrimary?: boolean;
  capturedAt?: string;
}

export interface ImportantDateRecord {
  label: string;
  value: string;
  kind?: 'application_start' | 'last_date' | 'exam_date' | 'result_date' | 'admit_card' | 'counselling' | 'other';
  isPrimary?: boolean;
  note?: string;
}

export interface EligibilityRecord {
  label: string;
  description: string;
  qualificationSlug?: string;
  minAge?: number;
  maxAge?: number;
  relaxationNote?: string;
}

export interface FeeRuleRecord {
  category: string;
  amount: string;
  currency?: string;
  paymentNote?: string;
}

export interface VacancyRowRecord {
  postName: string;
  department?: string;
  category?: string;
  vacancies: string;
  payLevel?: string;
  salaryNote?: string;
}

export interface AdmissionProgramRecord {
  programName: string;
  level?: string;
  department?: string;
  intake?: string;
  eligibilityNote?: string;
}

export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  canonicalPath?: string;
  indexable?: boolean;
  ogImage?: string;
  effectiveTitle?: string;
  effectiveDescription?: string;
  effectiveCanonicalPath?: string;
}

export interface TrustFields {
  verificationNote?: string;
  sourceNote?: string;
  correctionNote?: string;
  updatedLabel?: string;
  officialSources: OfficialSource[];
  verificationStatus?: 'verified' | 'review' | 'source_light';
  sourceCount?: number;
  hasPrimarySource?: boolean;
  primarySourceLabel?: string;
  latestSourceCapturedAt?: string;
  primarySourceDomain?: string;
  officialDomain?: string;
  domainMatch?: boolean;
}

export interface FreshnessSignals {
  archiveState: 'active' | 'expired' | 'archived';
  expiresSoon: boolean;
  isStale: boolean;
  needsReview: boolean;
  daysToExpiry?: number;
  daysSinceUpdate?: number;
  daysSinceSourceCapture?: number;
  staleReason?: string;
}

export interface SearchMeta {
  termCount: number;
  aliasCount: number;
  termsPreview: string[];
  searchReady: boolean;
}

export interface EditorialReadiness {
  canSubmit: boolean;
  canApprove: boolean;
  canPublish: boolean;
  issueCount: number;
  warningCount: number;
  issues: string[];
  warnings: string[];
}

export interface AlertMatchPreview {
  total: number;
  instant: number;
  daily: number;
  weekly: number;
}

export interface PostRecord {
  id: string;
  legacyAnnouncementId?: string;
  legacyId?: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: PostType;
  status: PostWorkflowStatus;
  summary: string;
  shortInfo?: string;
  body?: string;
  contentJson?: Record<string, unknown> | any[] | null;
  organization?: TaxonomyRef | null;
  categories: TaxonomyRef[];
  states: TaxonomyRef[];
  qualifications: TaxonomyRef[];
  institution?: TaxonomyRef | null;
  exam?: TaxonomyRef | null;
  importantDates: ImportantDateRecord[];
  eligibility: EligibilityRecord[];
  feeRules: FeeRuleRecord[];
  vacancyRows: VacancyRowRecord[];
  admissionPrograms: AdmissionProgramRecord[];
  officialSources: OfficialSource[];
  trust: TrustFields;
  seo: SeoFields;
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  flags: {
    urgent?: boolean;
    isNew?: boolean;
    lastDate?: boolean;
    featured?: boolean;
  };
  home: {
    section?: string;
    stickyRank?: number;
    highlight?: boolean;
    trendingScore?: number;
  };
  location?: string;
  salary?: string;
  postCount?: string;
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  resultDate?: string;
  expiresAt?: string;
  archivedAt?: string;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
  createdBy?: string;
  updatedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  currentVersion: number;
  searchText: string;
  freshness?: FreshnessSignals;
  searchMeta?: SearchMeta;
  readiness?: EditorialReadiness;
}

export interface PostVersionRecord {
  id: string;
  postId: string;
  version: number;
  note?: string;
  reason?: string;
  actorId?: string;
  snapshot: PostRecord;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  entityType: 'post' | 'workflow' | 'auth' | 'subscription';
  entityId: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const contentPageTypeValues = ['auxiliary', 'info', 'community', 'category_meta', 'resource_meta', 'state_directory'] as const;
export type ContentPageType = (typeof contentPageTypeValues)[number];

export interface ContentPageRecord {
  id: string;
  slug: string;
  pageType: ContentPageType;
  title: string;
  eyebrow?: string;
  description?: string;
  headerColor?: string;
  layoutVariant?: string;
  payload: Record<string, unknown>;
  status: PostWorkflowStatus;
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalPath?: string;
  seoIndexable?: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TaxonomyDocument extends TaxonomyRef {
  description?: string;
  officialWebsite?: string;
  shortName?: string;
  priority?: number;
  postCount?: number;
  type?: TaxonomyType;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertSubscriptionRecord {
  id: string;
  email: string;
  verified: boolean;
  isActive: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  categorySlugs: string[];
  categoryNames: string[];
  stateSlugs: string[];
  stateNames: string[];
  organizationSlugs: string[];
  organizationNames: string[];
  qualificationSlugs: string[];
  qualificationNames: string[];
  postTypes: PostType[];
  verificationToken?: string;
  unsubscribeToken: string;
  source?: string;
  alertCount?: number;
  lastAlertedAt?: string;
  lastDigestDailySentAt?: string;
  lastDigestWeeklySentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPostCard {
  id: string;
  legacyId?: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: PostType;
  section: PublicSection;
  href: string;
  org: string;
  date: string;
  postCount?: string;
  qualification?: string;
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  summary?: string;
  stateSlugs: string[];
}

export interface PublicPostDetail {
  post: PostRecord;
  card: PublicPostCard;
  canonicalPath: string;
  section: PublicSection;
  relatedCards: PublicPostCard[];
  breadcrumbs: Array<{ label: string; href: string }>;
  archiveState: 'active' | 'expired' | 'archived';
}

export interface PublicTaxonomyLanding {
  taxonomy: TaxonomyDocument;
  cards: PublicPostCard[];
  relatedCounts: Record<string, number>;
}

export interface AdminPostListResult {
  data: PostRecord[];
  total: number;
  count: number;
}

export type PublicSection = 'jobs' | 'results' | 'admit-cards' | 'admissions' | 'answer-keys' | 'syllabus';

export const publicSectionMap: Record<PostType, PublicSection> = {
  job: 'jobs',
  result: 'results',
  'admit-card': 'admit-cards',
  admission: 'admissions',
  'answer-key': 'answer-keys',
  syllabus: 'syllabus',
};

const taxonomyRefSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180).optional(),
});

export const officialSourceSchema = z.object({
  label: z.string().trim().min(1).max(180),
  url: z.string().url(),
  sourceType: z.enum(['notification', 'result', 'admit-card', 'website', 'prospectus', 'notice']).optional(),
  isPrimary: z.boolean().optional(),
  capturedAt: z.string().optional(),
});

export const importantDateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  kind: z.enum(['application_start', 'last_date', 'exam_date', 'result_date', 'admit_card', 'counselling', 'other']).optional(),
  isPrimary: z.boolean().optional(),
  note: z.string().trim().max(240).optional(),
});

export const eligibilitySchema = z.object({
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
  qualificationSlug: z.string().trim().max(180).optional(),
  minAge: z.coerce.number().int().min(0).max(99).optional(),
  maxAge: z.coerce.number().int().min(0).max(99).optional(),
  relaxationNote: z.string().trim().max(240).optional(),
});

export const feeRuleSchema = z.object({
  category: z.string().trim().min(1).max(120),
  amount: z.string().trim().min(1).max(60),
  currency: z.string().trim().max(10).optional(),
  paymentNote: z.string().trim().max(240).optional(),
});

export const vacancyRowSchema = z.object({
  postName: z.string().trim().min(1).max(180),
  department: z.string().trim().max(180).optional(),
  category: z.string().trim().max(120).optional(),
  vacancies: z.string().trim().min(1).max(80),
  payLevel: z.string().trim().max(120).optional(),
  salaryNote: z.string().trim().max(200).optional(),
});

export const admissionProgramSchema = z.object({
  programName: z.string().trim().min(1).max(180),
  level: z.string().trim().max(80).optional(),
  department: z.string().trim().max(180).optional(),
  intake: z.string().trim().max(80).optional(),
  eligibilityNote: z.string().trim().max(240).optional(),
});

export const seoFieldsSchema = z.object({
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  canonicalPath: z.string().trim().max(240).optional(),
  indexable: z.boolean().optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
}).optional();

export const postEditorSchema = z.object({
  title: z.string().trim().min(3).max(300),
  slug: z.string().trim().max(220).optional(),
  legacySlugs: z.array(z.string().trim().min(1).max(220)).default([]),
  type: z.enum(postTypeValues),
  summary: z.string().trim().min(10).max(500),
  shortInfo: z.string().trim().max(600).optional(),
  body: z.string().trim().max(50000).optional(),
  contentJson: z.any().optional(),
  organization: taxonomyRefSchema.nullish(),
  categories: z.array(taxonomyRefSchema).min(1),
  states: z.array(taxonomyRefSchema).default([]),
  qualifications: z.array(taxonomyRefSchema).default([]),
  institution: taxonomyRefSchema.nullish(),
  exam: taxonomyRefSchema.nullish(),
  importantDates: z.array(importantDateSchema).default([]),
  eligibility: z.array(eligibilitySchema).default([]),
  feeRules: z.array(feeRuleSchema).default([]),
  vacancyRows: z.array(vacancyRowSchema).default([]),
  admissionPrograms: z.array(admissionProgramSchema).default([]),
  officialSources: z.array(officialSourceSchema).default([]),
  verificationNote: z.string().trim().max(500).optional(),
  sourceNote: z.string().trim().max(500).optional(),
  correctionNote: z.string().trim().max(500).optional(),
  tag: z.enum(['new', 'hot', 'update', 'last-date']).optional(),
  flags: z.object({
    urgent: z.boolean().optional(),
    isNew: z.boolean().optional(),
    lastDate: z.boolean().optional(),
    featured: z.boolean().optional(),
  }).default({}),
  home: z.object({
    section: z.string().trim().max(120).optional(),
    stickyRank: z.coerce.number().int().min(0).max(999).optional(),
    highlight: z.boolean().optional(),
    trendingScore: z.coerce.number().int().min(0).max(1000).optional(),
  }).default({}),
  location: z.string().trim().max(120).optional(),
  salary: z.string().trim().max(160).optional(),
  postCount: z.string().trim().max(60).optional(),
  applicationStartDate: z.string().trim().max(80).optional(),
  lastDate: z.string().trim().max(80).optional(),
  examDate: z.string().trim().max(80).optional(),
  resultDate: z.string().trim().max(80).optional(),
  expiresAt: z.string().trim().max(80).optional(),
  seo: seoFieldsSchema,
  versionNote: z.string().trim().max(280).optional(),
});

export const adminPostListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(postTypeValues).optional(),
  status: z.enum([...workflowStatusValues, 'all'] as [PostWorkflowStatus | 'all', ...(PostWorkflowStatus | 'all')[]]).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(120).optional(),
  sort: z.enum(['newest', 'oldest', 'updated', 'published']).default('newest'),
});

export const publicPostListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(postTypeValues).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(120).optional(),
  qualification: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'expired', 'archived', 'all']).default('active'),
  sort: z.enum(['newest', 'oldest', 'updated', 'closing']).default('newest'),
});

export const taxonomyTypeValues = ['states', 'organizations', 'categories', 'institutions', 'exams', 'qualifications'] as const;
export type TaxonomyType = (typeof taxonomyTypeValues)[number];

export const workflowNoteSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const taxonomyEditorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  description: z.string().trim().max(500).optional(),
  officialWebsite: z.string().url().optional().or(z.literal('')),
  shortName: z.string().trim().max(60).optional(),
  priority: z.coerce.number().int().min(0).max(9999).optional(),
});

export const alertSubscriptionPublicSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  categories: z.array(z.string().trim().min(1).max(120)).default([]),
  states: z.array(z.string().trim().min(1).max(120)).default([]),
  organizations: z.array(z.string().trim().min(1).max(160)).default([]),
  qualifications: z.array(z.string().trim().min(1).max(160)).default([]),
  postTypes: z.array(z.enum(postTypeValues)).default([]),
  frequency: z.enum(['instant', 'daily', 'weekly']).default('daily'),
  source: z.string().trim().max(40).optional(),
});

export const alertSubscriptionAdminQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  frequency: z.enum(['all', 'instant', 'daily', 'weekly']).default('all'),
});

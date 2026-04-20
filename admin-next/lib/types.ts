export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';

export type AdminRole = 'superadmin' | 'editor' | 'reviewer' | 'admin' | 'user';
export type EditorialStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

export interface User {
  id: string;
  email: string;
  username: string;
  role: AdminRole;
  isActive: boolean;
  createdAt?: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
}

export interface TaxonomyRef {
  id?: string;
  name: string;
  slug: string;
}

export interface CmsOfficialSource {
  label: string;
  url: string;
  sourceType?: string;
  isPrimary?: boolean;
  capturedAt?: string;
}

export interface CmsImportantDate {
  label: string;
  value: string;
  kind?: string;
  isPrimary?: boolean;
  note?: string;
}

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: ContentType;
  status: EditorialStatus;
  summary: string;
  shortInfo?: string;
  body?: string;
  organization?: TaxonomyRef | null;
  categories: TaxonomyRef[];
  states: TaxonomyRef[];
  qualifications: TaxonomyRef[];
  institution?: TaxonomyRef | null;
  exam?: TaxonomyRef | null;
  importantDates: CmsImportantDate[];
  eligibility: Array<{ label: string; description: string }>;
  feeRules: Array<{ category: string; amount: string; paymentNote?: string }>;
  vacancyRows: Array<{ postName: string; department?: string; vacancies: string; payLevel?: string; salaryNote?: string }>;
  admissionPrograms: Array<{ programName: string; level?: string; department?: string; intake?: string; eligibilityNote?: string }>;
  officialSources: CmsOfficialSource[];
  trust: {
    verificationNote?: string;
    sourceNote?: string;
    correctionNote?: string;
    updatedLabel?: string;
    verificationStatus?: 'verified' | 'review' | 'source_light';
    sourceCount?: number;
    hasPrimarySource?: boolean;
    primarySourceLabel?: string;
    latestSourceCapturedAt?: string;
    primarySourceCapturedAt?: string;
    daysSincePrimarySourceCapture?: number;
    sourceNeedsRefresh?: boolean;
    primarySourceDomain?: string;
    officialDomain?: string;
    domainMatch?: boolean;
  };
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  flags: { urgent?: boolean; isNew?: boolean; lastDate?: boolean; featured?: boolean };
  home: { section?: string; stickyRank?: number; highlight?: boolean; trendingScore?: number };
  location?: string;
  salary?: string;
  postCount?: string;
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
  currentVersion: number;
  freshness?: {
    archiveState: 'active' | 'expired' | 'archived';
    expiresSoon: boolean;
    isStale: boolean;
    needsReview: boolean;
    daysToExpiry?: number;
    daysSinceUpdate?: number;
    daysSinceSourceCapture?: number;
    staleReason?: string;
  };
  searchMeta?: {
    termCount: number;
    aliasCount: number;
    termsPreview: string[];
    searchReady: boolean;
    coverageScore?: number;
  };
  readiness?: {
    canSubmit: boolean;
    canApprove: boolean;
    canPublish: boolean;
    issueCount: number;
    warningCount: number;
    issues: string[];
    warnings: string[];
    publishIssueCount?: number;
    publishIssues?: string[];
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalPath?: string;
    indexable?: boolean;
    ogImage?: string;
    effectiveTitle?: string;
    effectiveDescription?: string;
    effectiveCanonicalPath?: string;
  };
}

export interface CmsDashboardData {
  total: number;
  published: number;
  inReview: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  recentPosts: CmsPost[];
}

export interface WorkflowViolation {
  id: string;
  title: string;
  hoursOverdue: number;
}

export interface AlertMatchPreview {
  total: number;
  instant: number;
  daily: number;
  weekly: number;
}

export interface CmsTaxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  officialWebsite?: string;
  shortName?: string;
  priority?: number;
  type?: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications';
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertSubscriber {
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
  postTypes: ContentType[];
  alertCount?: number;
  lastAlertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertSubscriberStats {
  total: number;
  verified: number;
  unverified: number;
  active: number;
  inactive: number;
  byFrequency: Array<{ _id: string; count: number }>;
}

export interface EditorialBulkTransitionResult {
  total: number;
  successCount: number;
  failureCount: number;
  updated: CmsPost[];
  failures: Array<{ id: string; error: string }>;
  revalidatedCount?: number;
}

export interface AlertImpactQueueItem {
  post: CmsPost;
  preview: AlertMatchPreview;
}

export interface AlertPreferenceCoverage {
  sampleSize: number;
  frequencies: Array<{ key: string; count: number }>;
  postTypes: Array<{ key: string; count: number }>;
  categories: Array<{ slug: string; name: string; count: number }>;
  states: Array<{ slug: string; name: string; count: number }>;
  organizations: Array<{ slug: string; name: string; count: number }>;
  qualifications: Array<{ slug: string; name: string; count: number }>;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ImportantDate {
  id?: string;
  eventName: string;
  eventDate: string;
  description?: string;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  category: string;
  organization: string;
  content?: string;
  externalLink?: string;
  location?: string;
  deadline?: string | null;
  minQualification?: string;
  ageLimit?: string;
  applicationFee?: string;
  salaryMin?: number;
  salaryMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cutoffMarks?: string;
  totalPosts?: number;
  postedBy?: string;
  postedAt: string;
  updatedAt: string;
  status: AnnouncementStatus;
  publishAt?: string;
  isActive: boolean;
  viewCount: number;
  version?: number;
  tags?: Tag[];
  importantDates?: ImportantDate[];
  jobDetails?: Record<string, unknown>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonical?: string;
    indexPolicy?: 'index' | 'noindex';
    ogImage?: string;
  };
  home?: {
    section?: string;
    stickyRank?: number;
    highlight?: boolean;
    trendingScore?: number;
  };
  versions?: Array<{
    version: number;
    updatedAt: string;
    updatedBy?: string;
    note?: string;
  }>;
}

export interface DashboardData {
  announcements: {
    total: number;
    byStatus: Record<AnnouncementStatus, number>;
    byType: Record<ContentType, number>;
  };
  workspace: {
    total: number;
    byStatus: Record<AnnouncementStatus, number>;
    assignedToMe: number;
    unassignedPending: number;
    overdueReview: number;
  };
  qa: {
    totalQaIssues: number;
    pendingQaIssues: number;
  };
  sla: {
    pendingTotal: number;
    averageDays: number;
    buckets: { lt1: number; d1_3: number; d3_7: number; gt7: number };
  };
  recentAnnouncements: Array<{
    id: string;
    title: string;
    type: ContentType;
    status: AnnouncementStatus;
    organization: string;
    viewCount: number;
    updatedAt: string;
    postedAt: string;
  }>;
  users: {
    total: number;
    active: number;
    admins: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  count: number;
}

export interface AnalyticsOverview {
  totalAnnouncements: number;
  totalViews: number;
  totalSearches: number;
  totalEmailSubscribers: number;
  totalPushSubscribers: number;
  totalListingViews: number;
  totalCardClicks: number;
  clickThroughRate: number;
  funnelDropRate: number;
  viewTrend: { pct: number; direction: 'up' | 'down' | 'flat' };
  typeBreakdown: Array<{ type: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  dailyRollups: Array<{ date: string; views: number; searches: number }>;
  topSearches: Array<{ query: string; count: number }>;
  comparison: {
    viewsDeltaPct: number;
    searchesDeltaPct: number;
    ctrDeltaPct: number;
    dropOffDeltaPct: number;
    compareDays: number;
  };
  anomalies: Array<{
    key: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  frontendUrl: string;
  contactEmail: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  googleAnalyticsId: string;
  twitterUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  featureFlags: Record<string, boolean>;
}

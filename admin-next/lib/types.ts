export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';

export type AdminRole = 'superadmin' | 'editor' | 'reviewer' | 'admin' | 'user';

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

export interface Tag {
  id: number;
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

export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';
export type UserRole = 'user' | 'viewer' | 'reviewer' | 'editor' | 'admin';
export type TrackerStatus = 'saved' | 'applied' | 'admit-card' | 'exam' | 'result';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
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
  deadline?: Date;
  minQualification?: string;
  ageLimit?: string;
  applicationFee?: string;
  salaryMin?: number;
  salaryMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cutoffMarks?: string;
  totalPosts?: number;
  postedBy?: string;
  postedAt: Date;
  updatedAt: Date;
  status: AnnouncementStatus;
  publishAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  version: number;
  versions?: AnnouncementVersion[];
  isActive: boolean;
  viewCount: number;
  tags?: Tag[];
  importantDates?: ImportantDate[];
  jobDetails?: any;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface ImportantDate {
  id: string;
  announcementId: string;
  eventName: string;
  eventDate: Date;
  description?: string;
}

export interface AnnouncementVersion {
  version: number;
  updatedAt: Date;
  updatedBy?: string;
  note?: string;
  snapshot: {
    title: string;
    type: ContentType;
    category: string;
    organization: string;
    content?: string;
    externalLink?: string;
    location?: string;
    deadline?: Date;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    salaryMin?: number;
    salaryMax?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cutoffMarks?: string;
    totalPosts?: number;
    tags?: Tag[];
    importantDates?: ImportantDate[];
    jobDetails?: any;
    status?: AnnouncementStatus;
    publishAt?: Date;
    approvedAt?: Date;
    approvedBy?: string;
    isActive?: boolean;
  };
}

export interface CreateAnnouncementDto {
  title: string;
  type: ContentType;
  category: string;
  organization: string;
  content?: string;
  externalLink?: string;
  location?: string;
  deadline?: string;
  minQualification?: string;
  ageLimit?: string;
  applicationFee?: string;
  salaryMin?: number;
  salaryMax?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cutoffMarks?: string;
  totalPosts?: number;
  status?: AnnouncementStatus;
  publishAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  tags?: string[];
  importantDates?: Array<{
    eventName: string;
    eventDate: string;
    description?: string;
  }>;
  jobDetails?: any;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  twoFactorVerified?: boolean;
  twoFactorSetup?: boolean;
  sessionId?: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  announcementId: string;
  createdAt: Date;
}

export interface TrackedApplication {
  id: string;
  userId: string;
  announcementId?: string;
  slug: string;
  type: ContentType;
  title: string;
  organization?: string;
  deadline?: Date | null;
  status: TrackerStatus;
  notes?: string;
  reminderAt?: Date | null;
  trackedAt: Date;
  updatedAt: Date;
}

export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type UserRole = 'user' | 'admin';

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
  totalPosts?: number;
  postedBy?: string;
  postedAt: Date;
  updatedAt: Date;
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
  totalPosts?: number;
  tags?: string[];
  importantDates?: Omit<ImportantDate, 'id' | 'announcementId'>[];
  jobDetails?: any;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface Bookmark {
  id: string;
  userId: string;
  announcementId: string;
  createdAt: Date;
}

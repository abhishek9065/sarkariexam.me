export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// Re-export JobDetails type for convenience
export type { JobDetails } from './components/admin/JobPostingForm';

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
  deadline?: string;
  minQualification?: string;
  ageLimit?: string;
  applicationFee?: string;
  totalPosts?: number;
  postedAt: string;
  updatedAt?: string;
  isActive: boolean;
  viewCount: number;
  tags?: Tag[];
  importantDates?: { eventName: string; eventDate: string; description?: string }[];
  // Extended job details for comprehensive postings
  jobDetails?: import('./components/admin/JobPostingForm').JobDetails;
}


export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

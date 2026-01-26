import type { components } from './types/api';

// Re-export JobDetails type for convenience
export type { JobDetails } from './components/admin/JobPostingForm';

export type ContentType = components['schemas']['ContentType'];
export type Tag = components['schemas']['Tag'];
export type AnnouncementCard = components['schemas']['AnnouncementCard'];


export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';

export type AnnouncementVersion = {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  note?: string;
  snapshot: {
    title?: string;
    type?: ContentType;
    category?: string;
    organization?: string;
    content?: string;
    externalLink?: string;
    location?: string;
    deadline?: string;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    totalPosts?: number;
    status?: AnnouncementStatus;
    publishAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    isActive?: boolean;
  };
};

export type Announcement = Omit<components['schemas']['Announcement'], 'jobDetails' | 'deadline' | 'totalPosts'> & {
  jobDetails?: import('./components/admin/JobPostingForm').JobDetails;
  deadline?: string | null;
  totalPosts?: number | null;
  status?: AnnouncementStatus;
  publishAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  version?: number;
  versions?: AnnouncementVersion[];
};

export type User = Omit<components['schemas']['User'], 'role'> & {
  role: 'user' | 'admin';
};

export type AuthResponse = components['schemas']['AuthResponse']['data'];

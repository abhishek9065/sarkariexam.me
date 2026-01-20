import type { components } from './types/api';

// Re-export JobDetails type for convenience
export type { JobDetails } from './components/admin/JobPostingForm';

export type ContentType = components['schemas']['ContentType'];
export type Tag = components['schemas']['Tag'];
export type AnnouncementCard = components['schemas']['AnnouncementCard'];

export type Announcement = Omit<components['schemas']['Announcement'], 'jobDetails'> & {
  jobDetails?: import('./components/admin/JobPostingForm').JobDetails;
};

export type User = Omit<components['schemas']['User'], 'role'> & {
  role: 'user' | 'admin';
};

export type AuthResponse = components['schemas']['AuthResponse']['data'];

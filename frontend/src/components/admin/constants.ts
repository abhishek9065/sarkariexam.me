import { AnnouncementStatus, ContentType } from '../../types';

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
    { value: 'job', label: 'Latest Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Latest Results' },
    { value: 'answer-key', label: 'Answer Keys' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'admission', label: 'Admission' },
];

export const STATUS_OPTIONS: { value: AnnouncementStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

export const ACTIVE_USER_WINDOWS = [15, 30, 60, 120];

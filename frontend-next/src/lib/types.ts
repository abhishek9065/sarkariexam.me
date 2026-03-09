/* ─── Core enums / unions ─── */
export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';

/* ─── Tags ─── */
export interface Tag {
    id: number;
    name: string;
    slug: string;
}

/* ─── Important Dates ─── */
export interface ImportantDate {
    id?: string;
    eventName: string;
    eventDate: string;
    description?: string;
}

/* ─── Announcement (full) ─── */
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
    status?: AnnouncementStatus;
    publishAt?: string;
    isActive: boolean;
    viewCount: number;
    tags?: Tag[];
    importantDates?: ImportantDate[];
    jobDetails?: Record<string, unknown>;
}

/* ─── Lightweight card returned by /v3/cards ─── */
export interface AnnouncementCard {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization: string;
    location?: string;
    deadline?: string | null;
    totalPosts?: number;
    postedAt: string;
    viewCount?: number;
}

export type HomepageFeedSections = Record<ContentType, AnnouncementCard[]>;

export interface HomepageFeedData {
    latest: AnnouncementCard[];
    sections: HomepageFeedSections;
    generatedAt: string;
}

/* ─── User ─── */
export interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
}

/* ─── Auth ─── */
export interface AuthResponse {
    user: User;
}

/* ─── Search Suggestion ─── */
export interface SearchSuggestion {
    title: string;
    slug: string;
    type: ContentType;
    organization?: string;
}

/* ─── Paginated response wrapper ─── */
export interface PaginatedResponse<T> {
    data: T[];
    total?: number;
    nextCursor?: string;
    hasMore?: boolean;
}

/* ─── Content type config ─── */
export const TYPE_LABELS: Record<ContentType, string> = {
    job: 'Latest Jobs',
    result: 'Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    admission: 'Admissions',
    syllabus: 'Syllabus',
};

export const TYPE_ROUTES: Record<ContentType, string> = {
    job: '/jobs',
    result: '/results',
    'admit-card': '/admit-card',
    'answer-key': '/answer-key',
    admission: '/admission',
    syllabus: '/syllabus',
};

export const TYPE_SLUGS: Record<string, ContentType> = {
    jobs: 'job',
    results: 'result',
    'admit-card': 'admit-card',
    'answer-key': 'answer-key',
    admission: 'admission',
    syllabus: 'syllabus',
};

export const TYPE_COLORS: Record<ContentType, string> = {
    job: '#0069d9',
    result: '#0f9d58',
    'admit-card': '#f97316',
    'answer-key': '#7c3aed',
    admission: '#be185d',
    syllabus: '#0284c7',
};

export const TYPE_CTA: Record<ContentType, string> = {
    job: 'Apply Online',
    result: 'Check Result',
    'admit-card': 'Download Admit Card',
    'answer-key': 'Download Answer Key',
    admission: 'Apply Now',
    syllabus: 'View Syllabus',
};

export const CONTENT_TYPES: ContentType[] = ['job', 'result', 'admit-card', 'answer-key', 'admission', 'syllabus'];

export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';

export interface AnnouncementCard {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category?: string;
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
    generatedAt?: string;
}

export interface SearchSuggestion {
    title: string;
    slug: string;
    type: ContentType;
    organization?: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
}

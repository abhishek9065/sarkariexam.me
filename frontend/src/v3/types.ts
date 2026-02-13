import type {
    Announcement,
    ContentType,
    DashboardWidgetPayload,
    SearchSuggestion,
    TrackedApplication,
    TrackerStatus,
} from '../types';

export type SearchFilterTypeV3 = 'all' | 'job' | 'result' | 'admit-card';

export interface DenseListItemViewModel {
    id: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    category?: string;
    location?: string;
    deadline?: string | null;
    totalPosts?: number | null;
    viewCount?: number;
}

export interface HomeCompositionModel {
    urgent: Announcement[];
    featured: Announcement[];
    latestJobs: Announcement[];
    latestResults: Announcement[];
    latestAdmitCards: Announcement[];
    trending: Announcement[];
    upcomingDeadlines: Announcement[];
    stateLinks: Array<{ label: string; slug: string }>;
}

export interface CompareSelectionState {
    selections: Announcement[];
    isOpen: boolean;
    maxItems: number;
}

export interface GlobalSearchState {
    open: boolean;
    query: string;
    typeFilter: SearchFilterTypeV3;
    suggestions: SearchSuggestion[];
    recentSearches: string[];
    loading: boolean;
    error: string | null;
    activeIndex: number;
}

export interface PublicRouteFlagState {
    frontend_public_v3_home: boolean;
    frontend_public_v3_category: boolean;
    frontend_public_v3_detail: boolean;
    frontend_public_v3_profile: boolean;
}

export interface TrackerBoardState {
    items: TrackedApplication[];
    loading: boolean;
    syncing: boolean;
    error: string | null;
    statusCounts: Record<TrackerStatus, number>;
}

export interface WidgetCardsViewModel {
    personalized: boolean;
    widgets: DashboardWidgetPayload | null;
}

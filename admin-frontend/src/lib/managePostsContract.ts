export const MANAGE_POSTS_FILTER_KEYS = [
    'status',
    'type',
    'search',
    'dateStart',
    'dateEnd',
    'author',
    'assignee',
    'limit',
    'sort',
] as const;

export type ManagePostsFilterKey = typeof MANAGE_POSTS_FILTER_KEYS[number];
export type ManagePostsAssigneeFilter = 'me' | 'unassigned' | 'assigned';
export type ManagePostsStatusFilter = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived' | 'all';
export type ManagePostsLaneId = 'my-queue' | 'pending-review' | 'scheduled' | 'published' | 'all-posts';

export type ManagePostsFilterState = {
    status?: ManagePostsStatusFilter;
    type?: 'job' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'admission' | 'all';
    search?: string;
    dateStart?: string;
    dateEnd?: string;
    author?: string;
    assignee?: ManagePostsAssigneeFilter;
    limit?: number;
    sort?: 'newest' | 'oldest' | 'deadline' | 'updated' | 'views';
};

export type ManagePostsLaneDefinition = {
    id: ManagePostsLaneId;
    label: string;
    description: string;
    filters: ManagePostsFilterState;
};

export type ManagePostsLaneSnapshot = ManagePostsLaneDefinition & { count: number };

export type ManagePostsWorkspaceSnapshot = {
    generatedAt: string;
    capabilities: {
        announcementsRead: boolean;
        announcementsWrite: boolean;
        announcementsApprove: boolean;
        canManagePrivateViews: boolean;
        canManageSharedViews: boolean;
    };
    summary: {
        total: number;
        draft: number;
        pending: number;
        scheduled: number;
        published: number;
        archived: number;
        assignedToMe: number;
        unassignedPending: number;
        overdueReview: number;
        stalePending: number;
        accessibleSavedViews: number;
    };
    pendingSla: {
        pendingTotal: number;
        averageDays: number;
        staleCount: number;
    };
    lanes: ManagePostsLaneSnapshot[];
};

export const MANAGE_POSTS_LANE_REGISTRY: ManagePostsLaneDefinition[] = [
    {
        id: 'my-queue',
        label: 'My Queue',
        description: 'All posts currently assigned to your account across every workflow state.',
        filters: {
            status: 'all',
            assignee: 'me',
        },
    },
    {
        id: 'pending-review',
        label: 'Pending Review',
        description: 'Posts waiting on review or approval.',
        filters: {
            status: 'pending',
        },
    },
    {
        id: 'scheduled',
        label: 'Scheduled',
        description: 'Posts queued for automatic publication.',
        filters: {
            status: 'scheduled',
        },
    },
    {
        id: 'published',
        label: 'Published',
        description: 'Live posts currently visible on the public surface.',
        filters: {
            status: 'published',
        },
    },
    {
        id: 'all-posts',
        label: 'All Posts',
        description: 'All post states in one operational workspace.',
        filters: {
            status: 'all',
        },
    },
];

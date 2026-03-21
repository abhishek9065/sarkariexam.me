import { useCallback, useMemo } from 'react';

import { MANAGE_POSTS_LANE_REGISTRY } from '../../lib/managePostsContract';
import { useLocalStorageState } from '../../lib/useLocalStorageState';
import type {
    AdminAnnouncementAssigneeFilter,
    AdminAnnouncementFilterPreset,
    AdminManagePostsLane,
    AdminSavedView,
    AnnouncementSortOption,
    AnnouncementStatusFilter,
    AnnouncementTypeFilter,
} from '../../types';

const STATUS_KEY = 'admin-vnext-announcements-status';
const TYPE_KEY = 'admin-vnext-announcements-type';
const SEARCH_KEY = 'admin-vnext-announcements-search';
const LIMIT_KEY = 'admin-vnext-announcements-limit';
const OFFSET_KEY = 'admin-vnext-announcements-offset';
const SORT_KEY = 'admin-vnext-announcements-sort';
const VIEW_SELECTED_KEY = 'admin-vnext-announcements-view-selected';
const ASSIGNEE_KEY = 'admin-vnext-announcements-assignee';
const DATE_START_KEY = 'admin-vnext-announcements-date-start';
const DATE_END_KEY = 'admin-vnext-announcements-date-end';
const AUTHOR_KEY = 'admin-vnext-announcements-author';

export const LIMIT_OPTIONS = [20, 40, 60, 100];

const parseBoundedInt = (raw: string, fallback: number, min: number, max: number) => {
    const parsed = Number(raw.replace(/"/g, ''));
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) return parsed;
    return fallback;
};

const applySafeString = (value: unknown, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    return value;
};

const applySafeStatus = (value: unknown): AnnouncementStatusFilter | 'all' => {
    const allowed: Array<AnnouncementStatusFilter | 'all'> = ['all', 'draft', 'pending', 'scheduled', 'published', 'archived'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementStatusFilter | 'all')) {
        return value as AnnouncementStatusFilter | 'all';
    }
    return 'all';
};

const applySafeType = (value: unknown): AnnouncementTypeFilter | 'all' => {
    const allowed: Array<AnnouncementTypeFilter | 'all'> = ['all', 'job', 'result', 'admit-card', 'answer-key', 'syllabus', 'admission'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementTypeFilter | 'all')) {
        return value as AnnouncementTypeFilter | 'all';
    }
    return 'all';
};

const applySafeSort = (value: unknown): AnnouncementSortOption => {
    const allowed: AnnouncementSortOption[] = ['newest', 'oldest', 'updated', 'deadline', 'views'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementSortOption)) {
        return value as AnnouncementSortOption;
    }
    return 'newest';
};

const applySafeAssignee = (value: unknown): AdminAnnouncementAssigneeFilter | '' => {
    const allowed: AdminAnnouncementAssigneeFilter[] = ['me', 'unassigned', 'assigned'];
    if (typeof value === 'string' && allowed.includes(value as AdminAnnouncementAssigneeFilter)) {
        return value as AdminAnnouncementAssigneeFilter;
    }
    return '';
};

export const mapViewsToPresets = (views: AdminSavedView[]): AdminAnnouncementFilterPreset[] => views.map((view) => {
    const filters = (view.filters ?? {}) as Record<string, unknown>;
    return {
        id: view.id,
        label: view.name,
        query: applySafeString(filters.search),
        type: applySafeType(filters.type),
        status: applySafeStatus(filters.status),
        sort: applySafeSort((view.sort as Record<string, unknown> | undefined)?.option),
    };
});

export function useManagePostsState(input: {
    views: AdminSavedView[];
    onPresetApplied?: (view: AdminSavedView) => void;
}) {
    const { views, onPresetApplied } = input;
    const [status, setStatus] = useLocalStorageState<AnnouncementStatusFilter | 'all'>(STATUS_KEY, 'all');
    const [type, setType] = useLocalStorageState<AnnouncementTypeFilter | 'all'>(TYPE_KEY, 'all');
    const [search, setSearch] = useLocalStorageState<string>(SEARCH_KEY, '');
    const [limit, setLimit] = useLocalStorageState<number>(LIMIT_KEY, 40, (raw) => parseBoundedInt(raw, 40, 20, 100));
    const [offset, setOffset] = useLocalStorageState<number>(OFFSET_KEY, 0, (raw) => parseBoundedInt(raw, 0, 0, 100000));
    const [sortOption, setSortOption] = useLocalStorageState<AnnouncementSortOption>(SORT_KEY, 'newest');
    const [dateStart, setDateStart] = useLocalStorageState<string>(DATE_START_KEY, '');
    const [dateEnd, setDateEnd] = useLocalStorageState<string>(DATE_END_KEY, '');
    const [author, setAuthor] = useLocalStorageState<string>(AUTHOR_KEY, '');
    const [selectedViewId, setSelectedViewId] = useLocalStorageState<string>(VIEW_SELECTED_KEY, '');
    const [assignee, setAssignee] = useLocalStorageState<AdminAnnouncementAssigneeFilter | ''>(ASSIGNEE_KEY, '');

    const presets = useMemo(() => mapViewsToPresets(views), [views]);
    const selectedView = useMemo(
        () => views.find((view) => view.id === selectedViewId),
        [selectedViewId, views],
    );

    const applyPreset = useCallback((presetId: string) => {
        setSelectedViewId(presetId);
        if (!presetId) return;

        const view = views.find((item) => item.id === presetId);
        if (!view) return;

        const filters = (view.filters ?? {}) as Record<string, unknown>;
        setSearch(applySafeString(filters.search));
        setType(applySafeType(filters.type));
        setStatus(applySafeStatus(filters.status));
        const nextLimit = Number(filters.limit);
        if (Number.isFinite(nextLimit) && LIMIT_OPTIONS.includes(nextLimit)) {
            setLimit(nextLimit);
        }
        setDateStart(applySafeString(filters.dateStart));
        setDateEnd(applySafeString(filters.dateEnd));
        setAuthor(applySafeString(filters.author));
        setAssignee(applySafeAssignee(filters.assignee));
        setSortOption(applySafeSort((view.sort as Record<string, unknown> | undefined)?.option));
        setOffset(0);
        onPresetApplied?.(view);
    }, [onPresetApplied, setAssignee, setAuthor, setDateEnd, setDateStart, setLimit, setOffset, setSearch, setSelectedViewId, setSortOption, setStatus, setType, views]);

    const clearFilters = useCallback(() => {
        setSearch('');
        setType('all');
        setStatus('all');
        setSortOption('newest');
        setDateStart('');
        setDateEnd('');
        setAuthor('');
        setAssignee('');
        setOffset(0);
        setSelectedViewId('');
    }, [setAssignee, setAuthor, setDateEnd, setDateStart, setOffset, setSearch, setSelectedViewId, setSortOption, setStatus, setType]);

    const applyLane = useCallback((lane: Pick<AdminManagePostsLane, 'filters'>) => {
        setStatus(lane.filters.status ?? 'all');
        setAssignee(lane.filters.assignee ?? '');
        setOffset(0);
    }, [setAssignee, setOffset, setStatus]);

    const activeLaneId = useMemo(() => {
        const activeLane = MANAGE_POSTS_LANE_REGISTRY.find((lane) =>
            (lane.filters.status ?? 'all') === status
            && (lane.filters.assignee ?? '') === assignee);
        return activeLane?.id ?? '';
    }, [assignee, status]);

    return {
        status,
        setStatus,
        type,
        setType,
        search,
        setSearch,
        limit,
        setLimit,
        offset,
        setOffset,
        sortOption,
        setSortOption,
        dateStart,
        setDateStart,
        dateEnd,
        setDateEnd,
        author,
        setAuthor,
        assignee,
        setAssignee,
        selectedViewId,
        setSelectedViewId,
        selectedView,
        presets,
        applyPreset,
        clearFilters,
        applyLane,
        activeLaneId,
    };
}

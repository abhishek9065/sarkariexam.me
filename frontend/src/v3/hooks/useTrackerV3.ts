import { useMemo } from 'react';
import { useApplicationTracker } from '../../hooks/useApplicationTracker';
import type { Announcement, TrackerStatus } from '../../types';
import type { TrackerBoardState } from '../types';

const TRACKER_STATUS_ORDER: TrackerStatus[] = ['saved', 'applied', 'admit-card', 'exam', 'result'];

export interface UseTrackerV3Result extends TrackerBoardState {
    isTracked: (slug: string) => boolean;
    trackAnnouncement: (announcement: Announcement, status?: TrackerStatus) => Promise<void>;
    untrack: (slug: string) => Promise<void>;
    updateStatus: (slug: string, status: TrackerStatus) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useTrackerV3(): UseTrackerV3Result {
    const tracker = useApplicationTracker();

    const statusCounts = useMemo(() => {
        const counts: Record<TrackerStatus, number> = {
            saved: 0,
            applied: 0,
            'admit-card': 0,
            exam: 0,
            result: 0,
        };

        for (const item of tracker.items) {
            counts[item.status] += 1;
        }

        return counts;
    }, [tracker.items]);

    return {
        items: tracker.items,
        loading: tracker.loading,
        syncing: tracker.syncing,
        error: tracker.error,
        statusCounts,
        isTracked: tracker.isTracked,
        trackAnnouncement: tracker.trackAnnouncement,
        untrack: tracker.untrack,
        updateStatus: tracker.updateStatus,
        refresh: tracker.refresh,
    };
}

export function getTrackerStatusLabel(status: TrackerStatus): string {
    if (status === 'admit-card') return 'Admit Card';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getNextTrackerStatus(status: TrackerStatus): TrackerStatus {
    const index = TRACKER_STATUS_ORDER.indexOf(status);
    if (index < 0 || index >= TRACKER_STATUS_ORDER.length - 1) return status;
    return TRACKER_STATUS_ORDER[index + 1];
}

export default useTrackerV3;

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, ContentType, TrackedApplication, TrackerStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
    createTrackedApplication,
    deleteTrackedApplication,
    fetchTrackedApplications,
    importTrackedApplications,
    updateTrackedApplication,
} from '../utils/api';
import {
    getTrackedApplications as getLegacyTrackedApplications,
    removeTrackedApplication as removeLegacyTrackedApplication,
    updateTrackedApplicationStatus as updateLegacyTrackedApplicationStatus,
    upsertTrackedApplication as upsertLegacyTrackedApplication,
} from '../utils/applicationTracker';

type TrackPayload = {
    announcementId?: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    deadline?: string | null;
    status?: TrackerStatus;
    notes?: string;
    reminderAt?: string | null;
};

type UseApplicationTrackerResult = {
    items: TrackedApplication[];
    loading: boolean;
    syncing: boolean;
    error: string | null;
    isTracked: (slug: string) => boolean;
    track: (payload: TrackPayload) => Promise<void>;
    trackAnnouncement: (announcement: Announcement, status?: TrackerStatus) => Promise<void>;
    untrack: (slug: string) => Promise<void>;
    updateStatus: (slug: string, status: TrackerStatus) => Promise<void>;
    refresh: () => Promise<void>;
};

const MIGRATION_KEY_PREFIX = 'tracked-applications-v2-migrated';

const normalizeTrackedItems = (items: TrackedApplication[]) =>
    [...items].sort((a, b) => {
        const aTs = new Date(a.updatedAt).getTime();
        const bTs = new Date(b.updatedAt).getTime();
        return bTs - aTs;
    });

const fromLegacy = (legacy: ReturnType<typeof getLegacyTrackedApplications>): TrackedApplication[] =>
    legacy.map((item) => ({
        id: `local:${item.slug}`,
        slug: item.slug,
        title: item.title,
        type: item.type,
        organization: item.organization,
        deadline: item.deadline,
        status: item.status,
        trackedAt: item.trackedAt,
        updatedAt: item.updatedAt,
    }));

export function useApplicationTracker(): UseApplicationTrackerResult {
    const { token, user } = useAuth();
    const [items, setItems] = useState<TrackedApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const migrationKey = useMemo(() => `${MIGRATION_KEY_PREFIX}:${user?.id || 'anonymous'}`, [user?.id]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (!token) {
            setItems(normalizeTrackedItems(fromLegacy(getLegacyTrackedApplications())));
            setLoading(false);
            return;
        }

        try {
            const remote = await fetchTrackedApplications(token);
            setItems(normalizeTrackedItems(remote));
        } catch (err) {
            console.error('Failed to fetch tracked applications:', err);
            setError('Unable to load tracked applications.');
            setItems(normalizeTrackedItems(fromLegacy(getLegacyTrackedApplications())));
        } finally {
            setLoading(false);
        }
    }, [token]);

    const migrateLegacyIfNeeded = useCallback(async () => {
        if (!token) return;
        try {
            const alreadyMigrated = localStorage.getItem(migrationKey) === '1';
            if (alreadyMigrated) return;

            const legacyItems = getLegacyTrackedApplications();
            if (legacyItems.length === 0) {
                localStorage.setItem(migrationKey, '1');
                return;
            }

            await importTrackedApplications(
                token,
                legacyItems.map((item) => ({
                    slug: item.slug,
                    type: item.type,
                    title: item.title,
                    organization: item.organization,
                    deadline: item.deadline ?? null,
                    status: item.status,
                    trackedAt: item.trackedAt,
                    updatedAt: item.updatedAt,
                }))
            );

            localStorage.setItem(migrationKey, '1');
            const remote = await fetchTrackedApplications(token);
            setItems(normalizeTrackedItems(remote));
        } catch (err) {
            console.error('Failed to migrate tracked applications:', err);
        }
    }, [migrationKey, token]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        void migrateLegacyIfNeeded();
    }, [migrateLegacyIfNeeded]);

    const isTracked = useCallback((slug: string) => {
        if (!slug) return false;
        return items.some((item) => item.slug === slug);
    }, [items]);

    const track = useCallback(async (payload: TrackPayload) => {
        const status = payload.status ?? 'saved';
        const deadline = payload.deadline ?? null;

        setSyncing(true);
        setError(null);
        try {
            if (!token) {
                const next = upsertLegacyTrackedApplication({
                    slug: payload.slug,
                    title: payload.title,
                    type: payload.type,
                    organization: payload.organization,
                    deadline,
                    status,
                });
                setItems(normalizeTrackedItems(fromLegacy(next)));
                return;
            }

            const saved = await createTrackedApplication(token, {
                announcementId: payload.announcementId,
                slug: payload.slug,
                type: payload.type,
                title: payload.title,
                organization: payload.organization,
                deadline,
                status,
                notes: payload.notes,
                reminderAt: payload.reminderAt ?? null,
            });

            setItems((prev) => {
                const rest = prev.filter((item) => item.slug !== saved.slug);
                return normalizeTrackedItems([saved, ...rest]);
            });
        } catch (err) {
            console.error('Failed to track application:', err);
            setError('Unable to save tracking right now.');
        } finally {
            setSyncing(false);
        }
    }, [token]);

    const trackAnnouncement = useCallback(async (announcement: Announcement, status: TrackerStatus = 'saved') => {
        await track({
            announcementId: announcement.id,
            slug: announcement.slug,
            type: announcement.type,
            title: announcement.title,
            organization: announcement.organization,
            deadline: announcement.deadline ?? null,
            status,
        });
    }, [track]);

    const updateStatus = useCallback(async (slug: string, status: TrackerStatus) => {
        if (!slug) return;
        setSyncing(true);
        setError(null);
        try {
            if (!token) {
                const next = updateLegacyTrackedApplicationStatus(slug, status);
                setItems(normalizeTrackedItems(fromLegacy(next)));
                return;
            }

            const target = items.find((item) => item.slug === slug);
            if (!target?.id) return;
            const updated = await updateTrackedApplication(token, target.id, { status });
            setItems((prev) => normalizeTrackedItems(prev.map((item) => item.slug === slug ? updated : item)));
        } catch (err) {
            console.error('Failed to update tracked status:', err);
            setError('Unable to update tracking status.');
        } finally {
            setSyncing(false);
        }
    }, [items, token]);

    const untrack = useCallback(async (slug: string) => {
        if (!slug) return;
        setSyncing(true);
        setError(null);
        try {
            if (!token) {
                const next = removeLegacyTrackedApplication(slug);
                setItems(normalizeTrackedItems(fromLegacy(next)));
                return;
            }

            const target = items.find((item) => item.slug === slug);
            if (!target?.id) return;
            await deleteTrackedApplication(token, target.id);
            setItems((prev) => prev.filter((item) => item.slug !== slug));
        } catch (err) {
            console.error('Failed to untrack application:', err);
            setError('Unable to remove tracking right now.');
        } finally {
            setSyncing(false);
        }
    }, [items, token]);

    return {
        items,
        loading,
        syncing,
        error,
        isTracked,
        track,
        trackAnnouncement,
        untrack,
        updateStatus,
        refresh,
    };
}

export default useApplicationTracker;

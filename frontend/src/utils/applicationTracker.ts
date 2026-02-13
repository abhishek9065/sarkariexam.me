import type { ContentType } from '../types';

export type ApplicationStatus = 'saved' | 'applied' | 'admit-card' | 'exam' | 'result';

export interface TrackedApplication {
    slug: string;
    title: string;
    type: ContentType;
    organization?: string;
    deadline?: string | null;
    status: ApplicationStatus;
    trackedAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'tracked-applications-v1';
const MAX_TRACKED_APPLICATIONS = 150;

function parseTrackedApplications(raw: string | null): TrackedApplication[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry): entry is TrackedApplication => {
                if (!entry || typeof entry !== 'object') return false;
                const value = entry as Partial<TrackedApplication>;
                return typeof value.slug === 'string' && typeof value.title === 'string' && typeof value.type === 'string';
            })
            .slice(0, MAX_TRACKED_APPLICATIONS);
    } catch {
        return [];
    }
}

function persistTrackedApplications(items: TrackedApplication[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_TRACKED_APPLICATIONS)));
    } catch {
        // Ignore storage errors.
    }
}

export function getTrackedApplications(): TrackedApplication[] {
    if (typeof window === 'undefined') return [];
    return parseTrackedApplications(localStorage.getItem(STORAGE_KEY));
}

export function isApplicationTracked(slug: string): boolean {
    if (!slug) return false;
    return getTrackedApplications().some((item) => item.slug === slug);
}

export function upsertTrackedApplication(entry: {
    slug: string;
    title: string;
    type: ContentType;
    organization?: string;
    deadline?: string | null;
    status?: ApplicationStatus;
}) {
    const now = new Date().toISOString();
    const current = getTrackedApplications();
    const existing = current.find((item) => item.slug === entry.slug);

    const nextEntry: TrackedApplication = {
        slug: entry.slug,
        title: entry.title,
        type: entry.type,
        organization: entry.organization,
        deadline: entry.deadline,
        status: entry.status ?? existing?.status ?? 'saved',
        trackedAt: existing?.trackedAt ?? now,
        updatedAt: now,
    };

    const rest = current.filter((item) => item.slug !== entry.slug);
    const next = [nextEntry, ...rest].slice(0, MAX_TRACKED_APPLICATIONS);
    persistTrackedApplications(next);
    return next;
}

export function updateTrackedApplicationStatus(slug: string, status: ApplicationStatus) {
    const current = getTrackedApplications();
    const now = new Date().toISOString();
    const next = current.map((item) => {
        if (item.slug !== slug) return item;
        return {
            ...item,
            status,
            updatedAt: now,
        };
    });
    persistTrackedApplications(next);
    return next;
}

export function removeTrackedApplication(slug: string) {
    const next = getTrackedApplications().filter((item) => item.slug !== slug);
    persistTrackedApplications(next);
    return next;
}

import type { AlertSubscriptionRecord } from '../content/types.js';
import AlertSubscriptionModelPostgres from '../models/alertSubscriptions.postgres.js';
import { Announcement } from '../types.js';

import { sendAnnouncementEmail } from './email.js';

export interface SubscriberDispatchResult {
    matched: number;
    sent: number;
    skipped: number;
    frequency: 'instant' | 'daily' | 'weekly';
}

const normalizeToken = (value?: string | null): string => {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/\s+/g, '-');
};

const buildAnnouncementMatchState = (announcement: Announcement) => ({
    category: normalizeToken(announcement.category),
    type: normalizeToken(announcement.type),
    organization: normalizeToken(announcement.organization),
    state: normalizeToken(announcement.location),
    qualification: normalizeToken(announcement.minQualification),
});

const shouldDispatchToSubscriber = (
    announcement: ReturnType<typeof buildAnnouncementMatchState>,
    subscriber: AlertSubscriptionRecord
): boolean => {
    const matchesArray = (values?: string[], target?: string) => {
        const normalized = (values || []).map((value) => normalizeToken(value)).filter(Boolean);
        if (normalized.length === 0) return true;
        if (!target) return false;
        return normalized.includes(target);
    };

    return matchesArray(subscriber.categorySlugs, announcement.category)
        && matchesArray(subscriber.postTypes, announcement.type)
        && matchesArray(subscriber.organizationSlugs, announcement.organization)
        && matchesArray(subscriber.stateSlugs, announcement.state)
        && matchesArray(subscriber.qualificationSlugs, announcement.qualification);
};

export async function dispatchAnnouncementToSubscribers(
    announcement: Announcement,
    options?: {
        frequency?: 'instant' | 'daily' | 'weekly';
        dryRun?: boolean;
    }
): Promise<SubscriberDispatchResult> {
    const frequency = options?.frequency ?? 'instant';
    if (announcement.status !== 'published' || !announcement.isActive) {
        return { matched: 0, sent: 0, skipped: 0, frequency };
    }

    let subscribers: AlertSubscriptionRecord[] = [];
    try {
        // This temporary announcement-to-post shim preserves the legacy route contract
        // while subscription matching is now driven by the Prisma/Postgres content shape.
        const postRecord = {
            id: announcement.id,
            title: announcement.title,
            slug: announcement.slug,
            type: announcement.type,
            summary: announcement.content || announcement.title,
            status: announcement.status,
            version: announcement.version || 1,
            isActive: announcement.isActive,
            createdAt: (announcement as any).createdAt || new Date().toISOString(),
            updatedAt: (announcement.updatedAt as any)?.toISOString?.() || new Date().toISOString(),
            publishedAt: (announcement.postedAt as any)?.toISOString?.() || new Date().toISOString(),
            categories: announcement.category ? [{ id: 'legacy-category', name: announcement.category, slug: normalizeToken(announcement.category) }] : [],
            states: announcement.location ? [{ id: 'legacy-state', name: announcement.location, slug: normalizeToken(announcement.location) }] : [],
            organization: announcement.organization
              ? { id: 'legacy-organization', name: announcement.organization, slug: normalizeToken(announcement.organization) }
              : undefined,
            qualifications: announcement.minQualification
              ? [{ id: 'legacy-qualification', name: announcement.minQualification, slug: normalizeToken(announcement.minQualification) }]
              : [],
        } as any;
        subscribers = await AlertSubscriptionModelPostgres.listMatchingPost(postRecord, frequency);
    } catch (error) {
        console.error('[SubscriberDispatch] Failed to load subscriptions:', error);
        return { matched: 0, sent: 0, skipped: 0, frequency };
    }

    const matchState = buildAnnouncementMatchState(announcement);
    const emailToToken = new Map<string, string>();

    for (const subscriber of subscribers) {
        if (!subscriber?.email || !subscriber?.unsubscribeToken) continue;
        if (!shouldDispatchToSubscriber(matchState, subscriber)) continue;
        emailToToken.set(subscriber.email.toLowerCase(), subscriber.unsubscribeToken);
    }

    const matchedEmails = Array.from(emailToToken.keys());
    if (matchedEmails.length === 0 || options?.dryRun) {
        return { matched: matchedEmails.length, sent: 0, skipped: 0, frequency };
    }

    try {
        const sent = await sendAnnouncementEmail(matchedEmails, announcement, emailToToken);
        const skipped = Math.max(0, matchedEmails.length - sent);
        return {
            matched: matchedEmails.length,
            sent,
            skipped,
            frequency,
        };
    } catch (error) {
        console.error('[SubscriberDispatch] Announcement email dispatch failed:', error);
        return {
            matched: matchedEmails.length,
            sent: 0,
            skipped: matchedEmails.length,
            frequency,
        };
    }
}

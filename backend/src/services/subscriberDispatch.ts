import { Announcement } from '../types.js';

import { getCollection } from './cosmosdb.js';
import { sendAnnouncementEmail } from './email.js';

interface SubscriptionDoc {
    email: string;
    categories?: string[];
    categorySlugs?: string[];
    states?: string[];
    stateSlugs?: string[];
    organizations?: string[];
    organizationSlugs?: string[];
    qualifications?: string[];
    qualificationSlugs?: string[];
    postTypes?: string[];
    frequency?: 'instant' | 'daily' | 'weekly';
    verified: boolean;
    isActive: boolean;
    unsubscribeToken: string;
}

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
    subscriber: SubscriptionDoc
): boolean => {
    const matchesArray = (values?: string[], target?: string) => {
        const normalized = (values || []).map((value) => normalizeToken(value)).filter(Boolean);
        if (normalized.length === 0) return true;
        if (!target) return false;
        return normalized.includes(target);
    };

    return matchesArray(subscriber.categorySlugs || subscriber.categories, announcement.category)
        && matchesArray(subscriber.postTypes, announcement.type)
        && matchesArray(subscriber.organizationSlugs || subscriber.organizations, announcement.organization)
        && matchesArray(subscriber.stateSlugs || subscriber.states, announcement.state)
        && matchesArray(subscriber.qualificationSlugs || subscriber.qualifications, announcement.qualification);
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

    let subscribers: SubscriptionDoc[] = [];
    try {
        const collection = getCollection<SubscriptionDoc>('alert_subscriptions');
        subscribers = await collection
            .find({
                isActive: true,
                verified: true,
                frequency,
            })
            .project({
                email: 1,
                categorySlugs: 1,
                stateSlugs: 1,
                organizationSlugs: 1,
                qualificationSlugs: 1,
                postTypes: 1,
                unsubscribeToken: 1,
                frequency: 1,
            })
            .toArray() as SubscriptionDoc[];
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

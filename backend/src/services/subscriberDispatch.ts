import { Announcement } from '../types.js';

import { getCollection } from './cosmosdb.js';
import { sendAnnouncementEmail } from './email.js';

interface SubscriptionDoc {
    email: string;
    categories?: string[];
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

const buildAnnouncementTokens = (announcement: Announcement): Set<string> => {
    const tokens = new Set<string>();
    const category = normalizeToken(announcement.category);
    const type = normalizeToken(announcement.type);
    if (category) tokens.add(category);
    if (type) tokens.add(type);
    return tokens;
};

const shouldDispatchToSubscriber = (
    announcementTokens: Set<string>,
    categories?: string[]
): boolean => {
    if (!categories || categories.length === 0) {
        return true;
    }
    const normalizedCategories = categories
        .map((category) => normalizeToken(category))
        .filter(Boolean);
    if (normalizedCategories.length === 0) {
        return true;
    }
    return normalizedCategories.some((category) => announcementTokens.has(category));
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
        const collection = getCollection<SubscriptionDoc>('subscriptions');
        subscribers = await collection
            .find({
                isActive: true,
                verified: true,
                frequency,
            })
            .project({
                email: 1,
                categories: 1,
                unsubscribeToken: 1,
                frequency: 1,
            })
            .toArray() as SubscriptionDoc[];
    } catch (error) {
        console.error('[SubscriberDispatch] Failed to load subscriptions:', error);
        return { matched: 0, sent: 0, skipped: 0, frequency };
    }

    const announcementTokens = buildAnnouncementTokens(announcement);
    const emailToToken = new Map<string, string>();

    for (const subscriber of subscribers) {
        if (!subscriber?.email || !subscriber?.unsubscribeToken) continue;
        if (!shouldDispatchToSubscriber(announcementTokens, subscriber.categories)) continue;
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

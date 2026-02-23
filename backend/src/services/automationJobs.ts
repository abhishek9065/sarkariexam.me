import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

import { recordAdminAudit } from './adminAudit.js';
import { invalidateAnnouncementCaches } from './cacheInvalidation.js';
import { getCollection } from './cosmosdb.js';

let automationIntervalRef: NodeJS.Timeout | null = null;
const RUN_EVERY_MINUTES = 60; // Run every hour

async function checkLinkHealth(url: string): Promise<'active' | 'broken'> {
    if (!url || !url.startsWith('http')) return 'broken';
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SarkariExams/2.0' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 405 || res.status === 403 || res.status === 401) {
            // Anti-bot walls often return 405, 403, 401 on valid URLs for scripted HEAD requests
            return 'active';
        }
        return 'broken';
    } catch {
        // network error, timeout, server down, etc
        return 'broken';
    }
}

export async function runAutomationJobs() {
    let cachesInvalidated = false;
    try {
        const now = new Date();

        // 1. Link Manager Automation
        // Check links that haven't been checked recently (oldest first)
        console.log('[Automation] Running Link Health Check...');
        const linksCollection = getCollection<any>('link_records');
        const linksToCheck = await linksCollection.find({
            status: { $ne: 'expired' },
            url: { $exists: true, $ne: '' }
        }).sort({ updatedAt: 1 }).limit(50).toArray();

        for (const link of linksToCheck) {
            const status = await checkLinkHealth(link.url);
            await linksCollection.updateOne(
                { _id: link._id },
                { $set: { status, updatedAt: new Date(), lastCheckedAt: new Date() } }
            );
        }

        // Persist health events for the reporting dashboard
        if (linksToCheck.length > 0) {
            const healthEventsCollection = getCollection<any>('link_health_events');
            const events = linksToCheck.map((link: any) => ({
                url: link.url,
                linkId: link._id?.toHexString?.() || String(link._id),
                announcementId: link.announcementId,
                status: link.status === 'broken' ? 'broken' : 'ok',
                checkedAt: new Date(),
                checkedBy: 'system',
            }));
            await healthEventsCollection.insertMany(events).catch((err: any) => {
                console.error('[Automation] Failed to persist link health events:', err);
            });
        }

        const announcementsCollection = getCollection<any>('announcements');

        // 2. Scheduling Automation
        // Find scheduled posts where publishAt <= now
        console.log('[Automation] Executing Scheduled Posts...');
        const scheduledPosts = await announcementsCollection.find({
            status: 'scheduled',
            publishAt: { $lte: now }
        }).toArray();

        for (const post of scheduledPosts) {
            await AnnouncementModelMongo.update(
                post._id.toHexString(),
                { status: 'published', note: 'Auto-published by scheduling automation' } as any,
                'system'
            );
            recordAdminAudit({
                action: 'update' as any,
                announcementId: post._id.toHexString(),
                title: post.title,
                userId: 'system',
                note: 'Auto-published by scheduling automation'
            }).catch(console.error);
            cachesInvalidated = true;
        }

        // 3. Expiry Automation
        // Find published posts where deadline has passed by 30 days
        console.log('[Automation] Expiring Old Posts...');
        const expiryThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const expiredPosts = await announcementsCollection.find({
            status: 'published',
            deadline: { $lt: expiryThreshold }
        }).toArray();

        for (const post of expiredPosts) {
            await AnnouncementModelMongo.update(
                post._id.toHexString(),
                { status: 'archived', note: 'Auto-archived by expiry automation' } as any,
                'system'
            );
            recordAdminAudit({
                action: 'update' as any,
                announcementId: post._id.toHexString(),
                title: post.title,
                userId: 'system',
                note: 'Auto-archived by expiry automation'
            }).catch(console.error);
            cachesInvalidated = true;
        }

        if (cachesInvalidated) {
            await invalidateAnnouncementCaches().catch(console.error);
        }

    } catch (error) {
        console.error('[Automation] Failed to run background jobs:', error);
    }
}

export const scheduleAutomationJobs = (): void => {
    if (automationIntervalRef) return;

    // Initial run with 1 minute delay
    setTimeout(() => {
        void runAutomationJobs();
    }, 60 * 1000);

    automationIntervalRef = setInterval(() => {
        void runAutomationJobs();
    }, RUN_EVERY_MINUTES * 60 * 1000);
};

export const stopAutomationJobs = (): void => {
    if (!automationIntervalRef) return;
    clearInterval(automationIntervalRef);
    automationIntervalRef = null;
};

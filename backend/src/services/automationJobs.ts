import { WorkflowStatus } from '@prisma/client';

import PostModelPostgres from '../models/posts.postgres.js';

import { invalidateAnnouncementCaches } from './cacheInvalidation.js';
import { prismaApp } from './postgres/prisma.js';

let automationIntervalRef: NodeJS.Timeout | null = null;
const RUN_EVERY_MINUTES = 60; // Run every hour
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_GRACE_DAYS = Math.max(0, Math.min(45, Number(process.env.CONTENT_EXPIRY_GRACE_DAYS ?? 0) || 0));
const EXPIRY_SWEEP_LIMIT = Math.max(1, Math.min(500, Number(process.env.CONTENT_EXPIRY_SWEEP_LIMIT ?? 200) || 200));

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
        // Check official sources that haven't been checked recently
        console.log('[Automation] Running Link Health Check (Postgres)...');
        
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const linksToCheck = await prismaApp.officialSource.findMany({
            where: {
                OR: [
                    { capturedAt: { lt: oneWeekAgo } },
                    { capturedAt: null }
                ]
            },
            take: 50,
            orderBy: {
                capturedAt: 'asc' // Nulls will typically be ordered first or last depending on db, let's just take oldest
            }
        });

        for (const link of linksToCheck) {
            await checkLinkHealth(link.url || '');
            
            await prismaApp.officialSource.update({
                where: { id: link.id },
                data: {
                    capturedAt: now,
                    // In the future, we could add a `status` or `isAlive` column to OfficialSource if needed
                }
            });
            // We are skipping persisting health events to Mongo.
        }

        // 2. Scheduling Automation
        // Find scheduled posts where publishAt <= now
        console.log('[Automation] Executing Scheduled Posts...');
        const scheduledPosts = await prismaApp.post.findMany({
            where: {
                status: WorkflowStatus.APPROVED,
                publishedAt: { lte: now },
            },
            select: { id: true },
        });

        for (const post of scheduledPosts) {
            try {
                const published = await PostModelPostgres.transition(
                    post.id,
                    'publish',
                    'system',
                    'system',
                    'Auto-published by scheduling automation',
                );
                if (published) {
                    cachesInvalidated = true;
                }
            } catch (error) {
                console.warn(`[Automation] Failed to auto-publish ${post.id}:`, error);
            }
        }

        // 3. Expiry Automation
        // Archive published posts whose expiry is beyond the configured grace period.
        console.log('[Automation] Expiring Old Posts...');
        const expiryCutoff = new Date(now.getTime() - (EXPIRY_GRACE_DAYS * DAY_MS));
        const sweepResult = await PostModelPostgres.sweepExpiredPublishedPosts({
            limit: EXPIRY_SWEEP_LIMIT,
            actorId: 'system',
            actorRole: 'system',
            note: `Auto-archived by expiry automation (grace=${EXPIRY_GRACE_DAYS}d)`,
            now: expiryCutoff,
        });

        if (sweepResult.archivedCount > 0) {
            cachesInvalidated = true;
        }
        if (sweepResult.failures.length > 0) {
            console.warn(`[Automation] Expiry sweep failures=${sweepResult.failures.length}`);
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

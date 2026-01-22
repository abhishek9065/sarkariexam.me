type CosmosModule = typeof import('../src/services/cosmosdb.js');
type EmailModule = typeof import('../src/services/email.js');

const loadCosmos = async (): Promise<CosmosModule> => {
    try {
        return await import('../dist/services/cosmosdb.js');
    } catch {
        return await import('../src/services/cosmosdb.js');
    }
};

const loadEmail = async (): Promise<EmailModule> => {
    try {
        return await import('../dist/services/email.js');
    } catch {
        return await import('../src/services/email.js');
    }
};

interface SubscriptionDoc {
    email: string;
    categories: string[];
    frequency: 'instant' | 'daily' | 'weekly';
    verified: boolean;
    unsubscribeToken: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface AnnouncementDoc {
    title: string;
    slug: string;
    type: string;
    category: string;
    organization: string;
    deadline?: Date;
    postedAt: Date;
    isActive: boolean;
    status?: string;
    publishAt?: Date;
}

const args = process.argv.slice(2);

const getArgValue = (prefix: string): string | null => {
    const arg = args.find((value) => value.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : null;
};

const hasFlag = (flag: string): boolean => args.includes(flag);

const getFrequency = (): 'daily' | 'weekly' => {
    const arg = getArgValue('--frequency=');
    if (!arg) return 'daily';
    return arg === 'weekly' ? 'weekly' : 'daily';
};

const now = new Date();
const frequency = getFrequency();
const windowDays = frequency === 'weekly' ? 7 : 1;
const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
const previewEmail = getArgValue('--email=');
const dryRun = hasFlag('--dry-run');
const maxItems = (() => {
    const value = getArgValue('--limit=');
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 12;
})();

const liveQuery = {
    isActive: true,
    $or: [
        { status: { $in: ['published'] } },
        { status: { $exists: false } },
        { status: null },
        { status: 'scheduled', publishAt: { $lte: now } },
    ],
};

async function run() {
    const cosmos = await loadCosmos();
    const email = await loadEmail();

    if (!dryRun && !email.isEmailConfigured()) {
        console.log('[Digest] Email not configured. Exiting.');
        return;
    }

    await cosmos.connectToDatabase();
    const subscriptions = cosmos.getCollection<SubscriptionDoc>('subscriptions');
    const announcements = cosmos.getCollection<AnnouncementDoc>('announcements');
    const windowLabel = `Last ${windowDays} day${windowDays > 1 ? 's' : ''}`;

    const sendDigest = async (options: {
        email: string;
        announcements: Array<Pick<AnnouncementDoc, 'title' | 'slug' | 'type' | 'category' | 'organization' | 'deadline'>>;
        unsubscribeToken: string;
    }): Promise<boolean> => {
        if (dryRun) {
            console.log(`[Digest] Dry run: ${options.email} would receive ${options.announcements.length} items.`);
            return true;
        }
        return email.sendDigestEmail({
            email: options.email,
            announcements: options.announcements,
            unsubscribeToken: options.unsubscribeToken,
            frequency,
            windowLabel,
        });
    };

    if (previewEmail) {
        const docs = await announcements
            .find({
                ...liveQuery,
                postedAt: { $gte: since },
            })
            .sort({ postedAt: -1 })
            .limit(maxItems)
            .toArray();

        if (docs.length === 0) {
            console.log('[Digest] No announcements found for preview.');
            return;
        }

        const items = docs.map((doc) => ({
            title: doc.title,
            slug: doc.slug,
            type: doc.type,
            category: doc.category,
            organization: doc.organization,
            deadline: doc.deadline,
        }));

        const ok = await sendDigest({
            email: previewEmail,
            announcements: items,
            unsubscribeToken: 'preview',
        });

        console.log(`[Digest] ${dryRun ? 'Previewed' : 'Sent'} digest to ${previewEmail}.`);
        if (!ok && !dryRun) {
            console.log('[Digest] Preview send failed.');
        }
        return;
    }

    const activeSubs = await subscriptions
        .find({ isActive: true, verified: true, frequency })
        .toArray();

    let sent = 0;
    let eligible = 0;

    for (const sub of activeSubs) {
        const categoryFilter = sub.categories && sub.categories.length > 0
            ? { category: { $in: sub.categories } }
            : {};

        const docs = await announcements
            .find({
                ...liveQuery,
                ...categoryFilter,
                postedAt: { $gte: since },
            })
            .sort({ postedAt: -1 })
            .limit(maxItems)
            .toArray();

        if (docs.length === 0) continue;
        eligible += 1;

        const items = docs.map((doc) => ({
            title: doc.title,
            slug: doc.slug,
            type: doc.type,
            category: doc.category,
            organization: doc.organization,
            deadline: doc.deadline,
        }));

        const ok = await sendDigest({
            email: sub.email,
            announcements: items,
            unsubscribeToken: sub.unsubscribeToken,
        });

        if (ok) {
            sent += 1;
        }
    }

    if (dryRun) {
        console.log(`[Digest] Dry run: ${eligible}/${activeSubs.length} subscribers matched items.`);
    }
    console.log(`[Digest] Sent ${sent} ${frequency} digests.`);
}

run().catch((error) => {
    console.error('[Digest] Failed to run digest job:', error);
    process.exit(1);
});

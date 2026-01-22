import { connectToDatabase, getCollection } from '../src/services/cosmosdb.js';
import { sendDigestEmail, isEmailConfigured } from '../src/services/email.js';

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

const getFrequency = (): 'daily' | 'weekly' => {
    const arg = process.argv.find((value) => value.startsWith('--frequency='));
    if (!arg) return 'daily';
    const [, value] = arg.split('=');
    return value === 'weekly' ? 'weekly' : 'daily';
};

const now = new Date();
const frequency = getFrequency();
const windowDays = frequency === 'weekly' ? 7 : 1;
const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

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
    if (!isEmailConfigured()) {
        console.log('[Digest] Email not configured. Exiting.');
        return;
    }

    await connectToDatabase();
    const subscriptions = getCollection<SubscriptionDoc>('subscriptions');
    const announcements = getCollection<AnnouncementDoc>('announcements');

    const activeSubs = await subscriptions
        .find({ isActive: true, verified: true, frequency })
        .toArray();

    let sent = 0;

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
            .limit(12)
            .toArray();

        if (docs.length === 0) continue;

        const items = docs.map((doc) => ({
            title: doc.title,
            slug: doc.slug,
            type: doc.type,
            category: doc.category,
            organization: doc.organization,
            deadline: doc.deadline,
        }));

        const ok = await sendDigestEmail({
            email: sub.email,
            announcements: items,
            unsubscribeToken: sub.unsubscribeToken,
            frequency,
            windowLabel: `Last ${windowDays} day${windowDays > 1 ? 's' : ''}`,
        });

        if (ok) {
            sent += 1;
        }
    }

    console.log(`[Digest] Sent ${sent} ${frequency} digests.`);
}

run().catch((error) => {
    console.error('[Digest] Failed to run digest job:', error);
    process.exit(1);
});

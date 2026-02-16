import { AdminAccountsModelMongo } from '../src/models/adminAccounts.mongo.js';
import { connectToDatabase, getCollection } from '../src/services/cosmosdb.js';

type UserDoc = {
    _id: { toString(): string };
    email: string;
    role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'user';
    isActive?: boolean;
    twoFactorEnabled?: boolean;
    createdAt?: Date;
    lastLogin?: Date;
};

const ADMIN_ROLES = new Set(['admin', 'editor', 'reviewer', 'viewer']);

async function migrateAdminAccounts() {
    await connectToDatabase();
    await AdminAccountsModelMongo.ensureIndexes();

    const usersCollection = getCollection<UserDoc>('users');

    const users = await usersCollection.find({ role: { $in: Array.from(ADMIN_ROLES) } as any }).toArray();

    let upserted = 0;
    for (const user of users) {
        await AdminAccountsModelMongo.upsertFromUser({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled,
            isActive: user.isActive,
            createdAt: user.createdAt?.toISOString(),
            lastLogin: user.lastLogin?.toISOString(),
        });
        upserted += 1;
    }

    console.log(`[admin-accounts-migration] processed=${users.length} upserted=${upserted}`);
}

migrateAdminAccounts().catch((error) => {
    console.error('[admin-accounts-migration] failed', error);
    process.exit(1);
});

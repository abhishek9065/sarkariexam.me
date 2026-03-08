import crypto from 'crypto';

import { config } from '../config.js';
import { AdminAccountsModelMongo, type AdminAccountMetadata } from '../models/adminAccounts.mongo.js';
import { UserModelMongo } from '../models/users.mongo.js';

import { listAdminSessions } from './adminSessions.js';
import { getCollectionAsync } from './cosmosdb.js';
import { sendAdminPasswordResetEmail } from './email.js';
import RedisCache from './redis.js';

type AdminPortalRole = 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor';

interface AdminUserDoc {
    _id: any;
    email: string;
    username?: string;
    role: AdminPortalRole;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    lastLogin?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorBackupCodes?: Array<{ codeHash: string; usedAt?: Date | null }>;
}
const ADMIN_RESET_TOKEN_TTL_SECONDS = 15 * 60;
const ADMIN_RESET_TOKEN_BYTES = 32;

const createAdminResetToken = () => crypto.randomBytes(ADMIN_RESET_TOKEN_BYTES).toString('base64url');
const hashAdminResetToken = (token: string) => crypto
    .createHmac('sha256', config.adminBackupCodeSalt)
    .update(token)
    .digest('hex');
const getAdminPasswordResetKey = (userId: string) => `auth:admin_password_reset:${userId}`;

export const buildAdminResetUrl = (email: string, token: string) => {
    const frontendBase = config.frontendUrl.replace(/\/$/, '');
    const url = new URL(`${frontendBase}/admin-vnext/login`);
    url.searchParams.set('mode', 'reset-password');
    url.searchParams.set('email', email);
    url.hash = new URLSearchParams({ token }).toString();
    return url.toString();
};

const deriveInvitationState = (
    metadata: AdminAccountMetadata | undefined,
    lastLoginAt?: Date | null
): 'pending' | 'accepted' | 'reset-required' => {
    if (metadata?.passwordResetRequired) return 'reset-required';
    if (lastLoginAt) return 'accepted';
    return metadata?.invitationState ?? 'pending';
};

const randomPassword = () => `Temp#${crypto.randomBytes(12).toString('base64url')}Aa1`;

export async function issueAdminPasswordReset(userId: string, email: string, actorEmail?: string): Promise<void> {
    const token = createAdminResetToken();
    const tokenHash = hashAdminResetToken(token);
    const issuedAt = new Date().toISOString();

    await RedisCache.set(getAdminPasswordResetKey(userId), {
        tokenHash,
        email,
        issuedAt,
    }, ADMIN_RESET_TOKEN_TTL_SECONDS);

    const existingAccount = (await AdminAccountsModelMongo.findByUserIds([userId]))[userId];
    const metadata = (existingAccount?.metadata ?? {}) as AdminAccountMetadata;
    await AdminAccountsModelMongo.updateMetadata(userId, {
        email,
        role: (existingAccount?.role ?? 'viewer') as AdminPortalRole,
        status: existingAccount?.status ?? 'active',
        twoFactorEnabled: existingAccount?.twoFactorEnabled,
        lastLoginAt: existingAccount?.lastLoginAt ? new Date(existingAccount.lastLoginAt) : null,
        metadata: {
            ...metadata,
            invitationState: metadata.invitationState === 'accepted' ? 'accepted' : 'pending',
            passwordResetRequired: true,
            lastResetIssuedAt: issuedAt,
            ...(actorEmail ? { invitedBy: metadata.invitedBy ?? actorEmail } : {}),
        },
    });

    await sendAdminPasswordResetEmail(
        email,
        buildAdminResetUrl(email, token),
        Math.floor(ADMIN_RESET_TOKEN_TTL_SECONDS / 60),
    );
}

export async function inviteAdminUser(input: {
    email: string;
    role: AdminPortalRole;
    actorEmail?: string;
}): Promise<{ id: string; email: string; role: AdminPortalRole }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await UserModelMongo.findByEmail(normalizedEmail);
    let user = existing;

    if (!user) {
        user = await UserModelMongo.create({
            email: normalizedEmail,
            username: normalizedEmail.split('@')[0],
            password: randomPassword(),
            role: input.role,
        });
    } else {
        await UserModelMongo.update(user.id, {
            role: input.role,
            isActive: true,
        });
        user = await UserModelMongo.findById(user.id);
    }

    if (!user) {
        throw new Error('Unable to provision admin account.');
    }

    await AdminAccountsModelMongo.updateMetadata(user.id, {
        email: user.email,
        role: input.role,
        status: user.isActive ? 'active' : 'suspended',
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: user.lastLogin ? new Date(user.lastLogin) : null,
        metadata: {
            invitationState: 'pending',
            invitedAt: new Date().toISOString(),
            invitedBy: input.actorEmail ?? 'admin',
            passwordResetRequired: true,
        },
    });

    await issueAdminPasswordReset(user.id, user.email, input.actorEmail);

    return {
        id: user.id,
        email: user.email,
        role: input.role,
    };
}

export async function listAdminAccessUsers(): Promise<Array<Record<string, unknown>>> {
    const docs = await (await getCollectionAsync<AdminUserDoc>('users'))
        .find({ role: { $in: ['admin', 'editor', 'reviewer', 'viewer', 'contributor'] } as any })
        .sort({ updatedAt: -1 })
        .limit(500)
        .toArray() as AdminUserDoc[];

    const userIds = docs.map((doc) => doc._id.toString());
    const [accountsResult, sessionsResult] = await Promise.allSettled([
        AdminAccountsModelMongo.findByUserIds(userIds),
        listAdminSessions(),
    ]);

    if (accountsResult.status === 'rejected') {
        console.warn('[AdminAccess] Failed to load admin account metadata for roster:', accountsResult.reason);
    }
    if (sessionsResult.status === 'rejected') {
        console.warn('[AdminAccess] Failed to load admin sessions for roster:', sessionsResult.reason);
    }

    const accounts = accountsResult.status === 'fulfilled' ? accountsResult.value : {};
    const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];

    const activeSessionCountByUser = sessions.reduce<Record<string, number>>((acc, session) => {
        acc[session.userId] = (acc[session.userId] || 0) + 1;
        return acc;
    }, {});

    return docs.map((doc) => {
        const id = doc._id.toString();
        const account = accounts[id];
        const metadata = (account?.metadata ?? {}) as AdminAccountMetadata;
        const remainingBackupCodes = (doc.twoFactorBackupCodes ?? []).filter((code) => !code.usedAt).length;

        return {
            id,
            email: doc.email,
            username: doc.username,
            role: doc.role,
            isActive: Boolean(doc.isActive),
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            lastLoginAt: doc.lastLogin ?? null,
            twoFactorEnabled: Boolean(doc.twoFactorEnabled),
            activeSessionCount: activeSessionCountByUser[id] ?? 0,
            invitationState: deriveInvitationState(metadata, doc.lastLogin ?? null),
            invitedAt: metadata.invitedAt ?? null,
            invitedBy: metadata.invitedBy ?? null,
            passwordResetRequired: Boolean(metadata.passwordResetRequired),
            backupCodesAvailable: remainingBackupCodes,
            backupCodesTotal: doc.twoFactorBackupCodes?.length ?? 0,
        };
    });
}

export async function syncAdminAccessMetadata(input: {
    userId: string;
    email: string;
    role: AdminPortalRole;
    isActive: boolean;
    twoFactorEnabled?: boolean;
    lastLoginAt?: Date | null;
    patch?: Partial<AdminAccountMetadata>;
}): Promise<void> {
    const existingAccount = (await AdminAccountsModelMongo.findByUserIds([input.userId]))[input.userId];
    const metadata = {
        ...((existingAccount?.metadata ?? {}) as AdminAccountMetadata),
        ...(input.patch ?? {}),
    };

    await AdminAccountsModelMongo.updateMetadata(input.userId, {
        email: input.email,
        role: input.role,
        status: input.isActive ? 'active' : 'suspended',
        twoFactorEnabled: input.twoFactorEnabled,
        lastLoginAt: input.lastLoginAt ?? null,
        metadata,
    });
}

import type { AdminPermissionSnapshot, AdminStepUpGrant, AdminUser } from '../../types';
import { mutationHeaders, request } from './core';
import { ADMIN_API_PATHS } from './paths';

export async function adminAuthLogin(email: string, password: string, twoFactorCode?: string): Promise<void> {
    await request(ADMIN_API_PATHS.adminAuthLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) }),
    }, true);
}

export async function adminAuthLogout(): Promise<void> {
    await request(ADMIN_API_PATHS.adminAuthLogout, { method: 'POST' }, true);
}

export async function adminAuthStepUp(email: string, password: string, twoFactorCode?: string): Promise<AdminStepUpGrant> {
    const body = await request(ADMIN_API_PATHS.adminAuthStepUp, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify({
            email,
            password,
            ...(twoFactorCode ? { twoFactorCode } : {}),
        }),
    }, true);

    const token = body?.data?.token;
    const expiresAt = body?.data?.expiresAt;
    if (typeof token !== 'string' || typeof expiresAt !== 'string') {
        throw new Error('Invalid step-up response');
    }

    return { token, expiresAt };
}

export async function getAdminMe(): Promise<AdminUser | null> {
    const body = await request(ADMIN_API_PATHS.adminAuthMe);
    return body?.data?.user ?? null;
}

export async function getAdminPermissions(): Promise<AdminPermissionSnapshot | null> {
    const body = await request(ADMIN_API_PATHS.adminAuthPermissions);
    return body?.data ?? null;
}

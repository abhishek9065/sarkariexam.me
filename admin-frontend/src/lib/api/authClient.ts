import type { AdminPermissionSnapshot, AdminStepUpGrant, AdminUser } from '../../types';
import { mutationHeaders, request } from './core';

export async function adminAuthLogin(email: string, password: string, twoFactorCode?: string): Promise<void> {
    await request('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) }),
    }, true);
}

export async function adminAuthLogout(): Promise<void> {
    await request('/api/admin-auth/logout', { method: 'POST' }, true);
}

export async function adminAuthStepUp(email: string, password: string, twoFactorCode?: string): Promise<AdminStepUpGrant> {
    const body = await request('/api/admin-auth/step-up', {
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
    const body = await request('/api/admin-auth/me');
    return body?.data?.user ?? null;
}

export async function getAdminPermissions(): Promise<AdminPermissionSnapshot | null> {
    const body = await request('/api/admin-auth/permissions');
    return body?.data ?? null;
}

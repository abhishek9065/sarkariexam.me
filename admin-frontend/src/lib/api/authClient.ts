import type { AdminAuthLoginResult, AdminPermissionSnapshot, AdminStepUpGrant, AdminUser } from '../../types';
import { AdminApiWorkflowError, mutationHeaders, request } from './core';
import { ADMIN_API_PATHS } from './paths';

export async function adminAuthLogin(
    email: string,
    password?: string,
    twoFactorCode?: string,
    challengeToken?: string
): Promise<AdminAuthLoginResult> {
    try {
        await request(ADMIN_API_PATHS.adminAuthLogin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                ...(password ? { password } : {}),
                ...(challengeToken ? { challengeToken } : {}),
                ...(twoFactorCode ? { twoFactorCode } : {}),
            }),
        }, true);
        return { status: 'authenticated' };
    } catch (error) {
        if (error instanceof AdminApiWorkflowError) {
            if (error.code === 'two_factor_required') {
                const nextChallengeToken = typeof error.body?.challengeToken === 'string' ? error.body.challengeToken : undefined;
                return { status: 'two-factor-required', challengeToken: nextChallengeToken, message: error.message };
            }
            if (error.code === 'two_factor_setup_required') {
                const setupToken = typeof error.body?.setupToken === 'string' ? error.body.setupToken : undefined;
                return {
                    status: 'two-factor-setup-required',
                    setupToken,
                    message: error.message,
                };
            }
        }
        throw error;
    }
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

    const data = body?.data as Record<string, unknown> | undefined;
    const token = data?.token;
    const expiresAt = data?.expiresAt;
    if (typeof token !== 'string' || typeof expiresAt !== 'string') {
        throw new Error('Invalid step-up response');
    }

    return { token, expiresAt };
}

export async function getAdminMe(): Promise<AdminUser | null> {
    const body = await request(ADMIN_API_PATHS.adminAuthMe);
    return (body?.data as Record<string, unknown> | undefined)?.user as AdminUser | null ?? null;
}

export async function getAdminPermissions(): Promise<AdminPermissionSnapshot | null> {
    const body = await request(ADMIN_API_PATHS.adminAuthPermissions);
    return (body?.data as AdminPermissionSnapshot | undefined) ?? null;
}

export async function adminForgotPassword(email: string): Promise<void> {
    await request(ADMIN_API_PATHS.adminForgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    }, true);
}

export async function adminResetPassword(email: string, token: string, password: string): Promise<void> {
    await request(ADMIN_API_PATHS.adminResetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
    }, true);
}

export async function getAdminBackupCodeStatus(): Promise<{ total: number; remaining: number; updatedAt?: string | null }> {
    const body = await request(ADMIN_API_PATHS.adminBackupCodeStatus);
    const data = body?.data as Record<string, unknown> | undefined;
    return {
        total: typeof data?.total === 'number' ? data.total : 0,
        remaining: typeof data?.remaining === 'number' ? data.remaining : 0,
        updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
    };
}

export async function setupAdminTwoFactor(setupToken?: string): Promise<{ qrCode: string; secret: string }> {
    const body = await request(ADMIN_API_PATHS.admin2faSetup, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(setupToken ? { setupToken } : {}),
    }, true);
    const data = body?.data as Record<string, unknown> | undefined;
    if (typeof data?.qrCode !== 'string' || typeof data?.secret !== 'string') {
        throw new Error('Invalid two-factor setup response');
    }
    return { qrCode: data.qrCode, secret: data.secret };
}

export async function verifyAdminTwoFactor(code: string, setupToken?: string): Promise<void> {
    await request(ADMIN_API_PATHS.admin2faVerify, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify({ code, ...(setupToken ? { setupToken } : {}) }),
    }, true);
}

export async function generateAdminBackupCodes(setupToken?: string): Promise<{ codes: string[]; generatedAt: string; total: number }> {
    const body = await request(ADMIN_API_PATHS.adminBackupCodes, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(setupToken ? { setupToken } : {}),
    }, true);
    const data = body?.data as Record<string, unknown> | undefined;
    return {
        codes: Array.isArray(data?.codes) ? data?.codes.filter((item): item is string => typeof item === 'string') : [],
        generatedAt: typeof data?.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
        total: typeof data?.total === 'number' ? data.total : 0,
    };
}

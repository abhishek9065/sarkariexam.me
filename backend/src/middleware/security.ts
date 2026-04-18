import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import RedisCache from '../services/redis.js';
import { sanitizeForLog } from '../utils/logSanitizer.js';

/**
 * Comprehensive security middleware
 * Applies multiple security layers to protect against common attacks
 * Uses Redis for brute-force protection (distributed safe)
 */

const MAX_FAILED_ATTEMPTS = 3;
const BLOCK_DURATION_SEC = 30 * 60; // 30 minutes

const normalizeEmail = (email?: string): string | null => {
    if (!email) return null;
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
};

const buildIpKey = (ip: string) => `bf:ip:${ip}`;
const buildEmailKey = (email: string) => `bf:email:${email}`;
const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const normalizeIp = (value?: string | null): string => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
    if (trimmed === '::1') return '127.0.0.1';
    const zoneIndex = trimmed.indexOf('%');
    return zoneIndex >= 0 ? trimmed.slice(0, zoneIndex) : trimmed;
};

const readSingleIpHeader = (value: string | string[] | undefined): string => {
    if (!value) return '';
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return '';
    return normalizeIp(raw.split(',')[0] ?? '');
};

const isTrustedProxyIp = (value: string): boolean => {
    const ip = normalizeIp(value);
    if (!ip) return false;
    if (ip === '127.0.0.1') return true;
    if (ip.startsWith('10.')) return true;
    if (/^192\.168\./.test(ip)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
    if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')) return true;
    return false;
};

/**
 * Helmet security headers configuration
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'none'"],
            styleSrc: ["'none'"],
            fontSrc: ["'none'"],
            imgSrc: ["'none'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'none'"],
            formAction: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xXssProtection: false,
});

/**
 * Brute-force protection for login attempts
 * Blocks IP after 5 failed attempts for 15 minutes
 */
export async function bruteForceProtection(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIP(req);
    const email = normalizeEmail((req.body as any)?.email);
    const keys = [buildIpKey(ip), email ? buildEmailKey(email) : null].filter(Boolean) as string[];

    try {
        const records = await Promise.all(keys.map((key) => RedisCache.get(key)));
        
        if (records.some((record) => record && record.count >= MAX_FAILED_ATTEMPTS)) {
            // Mark as blocked but allow handler to verify correct credentials.
            const waitTime = Math.ceil(BLOCK_DURATION_SEC / 60);
            (req as any).bruteForceBlocked = true;
            (req as any).bruteForceWaitMinutes = waitTime;
        }
    } catch (err) {
        console.error('Brute force check failed:', err);
    }

    next();
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(ip: string): Promise<void> {
    await recordFailedLoginWithEmail(ip);
}

export async function recordFailedLoginWithEmail(ip: string, email?: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const keys = [buildIpKey(ip), normalizedEmail ? buildEmailKey(normalizedEmail) : null].filter(Boolean) as string[];
    try {
        for (const key of keys) {
            const record = await RedisCache.get(key);
            
            if (!record) {
                await RedisCache.set(key, { count: 1 }, BLOCK_DURATION_SEC);
            } else {
                const newCount = record.count + 1;
                await RedisCache.set(key, { count: newCount }, BLOCK_DURATION_SEC);
                
                if (newCount >= MAX_FAILED_ATTEMPTS) {
                    if (key.startsWith('bf:ip:')) {
                        console.log('[SECURITY_BRUTE_FORCE_BLOCK]', {
                            scope: 'ip',
                            ip: sanitizeForLog(ip, 64),
                            blockMinutes: Math.round(BLOCK_DURATION_SEC / 60),
                        });
                    } else if (normalizedEmail) {
                        console.log('[SECURITY_BRUTE_FORCE_BLOCK]', {
                            scope: 'account',
                            account: sanitizeForLog(normalizedEmail, 120),
                            blockMinutes: Math.round(BLOCK_DURATION_SEC / 60),
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Failed to record login attempt:', err);
    }
}

/**
 * Clear failed login record on successful login
 */
export async function clearFailedLogins(ip: string): Promise<void> {
    await clearFailedLoginsWithEmail(ip);
}

export async function clearFailedLoginsWithEmail(ip: string, email?: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const keys = [buildIpKey(ip), normalizedEmail ? buildEmailKey(normalizedEmail) : null].filter(Boolean) as string[];
    await Promise.all(keys.map((key) => RedisCache.del(key)));
}

/**
 * Get real client IP (handles proxies)
 */
export function getClientIP(req: Request): string {
    const realIp = normalizeIp((req as any).realIp);
    if (realIp) {
        return realIp;
    }

    const expressIp = normalizeIp(req.ip);
    if (expressIp) {
        return expressIp;
    }

    const socketIp = normalizeIp(req.socket?.remoteAddress ?? '');
    if (isTrustedProxyIp(socketIp)) {
        const realHeaderIp = readSingleIpHeader(req.headers['x-real-ip']);
        if (realHeaderIp) return realHeaderIp;

        const forwardedHeaderIp = readSingleIpHeader(req.headers['x-forwarded-for']);
        if (forwardedHeaderIp) return forwardedHeaderIp;

        const cloudflareHeaderIp = readSingleIpHeader(req.headers['cf-connecting-ip']);
        if (cloudflareHeaderIp) return cloudflareHeaderIp;
    }

    return socketIp || 'unknown';
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/`/g, '&#96;')
        .trim();
}

/**
 * Fields that should NOT be sanitized (passwords, tokens, etc.)
 */
const SENSITIVE_FIELDS = new Set([
    'password', 'currentPassword', 'newPassword', 'confirmPassword',
    'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
    'auth', 'p256dh', 'authorization',
]);

/**
 * Sanitize object recursively, skipping sensitive fields
 */
export function sanitizeObject<T extends object>(obj: T): T {
    return sanitizeValue(obj) as T;
}

function sanitizeValue(value: unknown, fieldName?: string): unknown {
    if (typeof value === 'string') {
        if (fieldName && SENSITIVE_FIELDS.has(fieldName.toLowerCase())) return value;
        return sanitizeInput(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
        const safeEntries = Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !BLOCKED_OBJECT_KEYS.has(key))
            .map(([key, nestedValue]) => {
                if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
                    return [key, nestedValue] as const;
                }
                return [key, sanitizeValue(nestedValue, key)] as const;
            });

        return Object.assign(Object.create(null), Object.fromEntries(safeEntries));
    }

    return value;
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}

/**
 * Block suspicious user agents (basic bot detection)
 */
export function blockSuspiciousAgents(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] || '';

    const maliciousPatterns = [
        /nikto/i, /sqlmap/i, /nmap/i, /masscan/i,
        /havij/i, /acunetix/i, /nessus/i, /burp/i,
        /metasploit/i, /w3af/i
    ];

    if (maliciousPatterns.some(pattern => pattern.test(userAgent))) {
        console.log('[SECURITY_BLOCKED_USER_AGENT]', {
            userAgent: sanitizeForLog(userAgent, 200),
        });
        return res.status(403).json({ error: 'Access denied' });
    }

    next();
}

/**
 * Validate Content-Type for POST/PUT/PATCH
 * Skip OPTIONS requests (CORS preflight)
 */
export function validateContentType(req: Request, res: Response, next: NextFunction) {
    // Skip OPTIONS preflight requests (CORS)
    if (req.method === 'OPTIONS') {
        return next();
    }

    const methods = ['POST', 'PUT', 'PATCH'];

    if (methods.includes(req.method)) {
        const contentType = req.headers['content-type'];
        const contentLength = Number(req.headers['content-length'] ?? 0);
        if (!contentType) {
            if (contentLength === 0) {
                return next();
            }
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
        if (!contentType.includes('application/json')) {
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
    }

    next();
}


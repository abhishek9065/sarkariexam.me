import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import RedisCache from '../services/redis.js';

/**
 * Comprehensive security middleware
 * Applies multiple security layers to protect against common attacks
 * Uses Redis for brute-force protection (distributed safe)
 */

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_SEC = 15 * 60; // 15 minutes

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
    const key = `bf:${ip}`;

    try {
        const record = await RedisCache.get(key);
        
        if (record && record.count >= MAX_FAILED_ATTEMPTS) {
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
    const key = `bf:${ip}`;
    try {
        const record = await RedisCache.get(key);
        
        if (!record) {
            await RedisCache.set(key, { count: 1 }, BLOCK_DURATION_SEC);
        } else {
            const newCount = record.count + 1;
            await RedisCache.set(key, { count: newCount }, BLOCK_DURATION_SEC);
            
            if (newCount >= MAX_FAILED_ATTEMPTS) {
                console.log(`[SECURITY] IP ${ip} blocked for 15 minutes due to failed login attempts`);
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
    const key = `bf:${ip}`;
    await RedisCache.del(key);
}

/**
 * Get real client IP (handles proxies)
 */
export function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
        return ips[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
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
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
            result[key] = value;
        } else if (typeof value === 'string') {
            result[key] = sanitizeInput(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }
    return result as T;
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
        console.log(`[SECURITY] Blocked suspicious user agent: ${userAgent}`);
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
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
    }

    next();
}

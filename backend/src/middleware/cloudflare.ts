import { BlockList } from 'node:net';

import { Request, Response, NextFunction } from 'express';

/**
 * Cloudflare IP ranges.
 * Source: https://www.cloudflare.com/ips/
 */
const CLOUDFLARE_IPV4_RANGES = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22',
];

const CLOUDFLARE_IPV6_RANGES = [
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32',
];

const CLOUDFLARE_BLOCKLIST = (() => {
    const list = new BlockList();
    const addSubnet = (cidr: string) => {
        const [network, prefixRaw] = cidr.split('/');
        const prefix = Number(prefixRaw);
        if (!network || !Number.isFinite(prefix)) return;
        const type = network.includes(':') ? 'ipv6' : 'ipv4';
        list.addSubnet(network, prefix, type);
    };
    for (const cidr of CLOUDFLARE_IPV4_RANGES) addSubnet(cidr);
    for (const cidr of CLOUDFLARE_IPV6_RANGES) addSubnet(cidr);
    return list;
})();

function normalizeIp(ip: string): string {
    if (!ip) return '';
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    if (ip === '::1') return '127.0.0.1';
    const zoneIndex = ip.indexOf('%');
    return zoneIndex > -1 ? ip.slice(0, zoneIndex) : ip;
}

const normalizeHeaderIp = (value: string | string[] | undefined): string => {
    if (!value) return '';
    const first = Array.isArray(value) ? value[0] : value;
    if (!first) return '';
    return normalizeIp(first.trim());
};

/**
 * Check if request comes from Cloudflare edge.
 */
export function isCloudflareRequest(ip: string): boolean {
    const normalized = normalizeIp(ip);
    if (!normalized) return false;
    const type = normalized.includes(':') ? 'ipv6' : 'ipv4';
    try {
        return CLOUDFLARE_BLOCKLIST.check(normalized, type);
    } catch {
        return false;
    }
}

/**
 * Middleware to extract real client IP from Cloudflare headers.
 */
export function cloudflareMiddleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
        const connectingIp = normalizeIp(req.socket.remoteAddress || '');
        const cfConnectingIp = normalizeHeaderIp(req.headers['cf-connecting-ip']);
        const cfCountry = req.headers['cf-ipcountry'] as string;
        const cfRay = req.headers['cf-ray'] as string;

        if (cfConnectingIp && isCloudflareRequest(connectingIp)) {
            (req as any).realIp = cfConnectingIp;
            (req as any).cfCountry = cfCountry;
            (req as any).cfRay = cfRay;
            (req as any).isCloudflare = true;
        } else {
            (req as any).realIp = req.ip || connectingIp;
            (req as any).isCloudflare = false;
            if (cfConnectingIp) {
                console.warn('[Cloudflare] Ignored spoofed CF-Connecting-IP header');
            }
        }

        next();
    };
}

/**
 * Get real client IP from request.
 */
export function getRealIp(req: Request): string {
    return (req as any).realIp || req.ip || 'unknown';
}

/**
 * Get Cloudflare country code from request.
 */
export function getCountry(req: Request): string | undefined {
    return (req as any).cfCountry;
}

export default cloudflareMiddleware;

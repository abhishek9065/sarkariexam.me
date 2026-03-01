export function maskIpAddress(ip?: string | null): string {
    if (!ip) return '';

    if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }
    }

    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length > 3) {
            return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
        }
        // Short/compact IPv6 (e.g. ::1, fe80::1) — mask entirely
        return 'xxxx:xxxx';
    }

    return ip;
}

const normalizeBase = (value: string) => value.trim().replace(/\/+$/, '');

export function normalizeConfiguredApiBase(value: string | null | undefined): string | null {
    if (!value || !value.trim()) return null;
    const normalized = normalizeBase(String(value));
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export function resolveSiblingApiBase(hostname?: string | null): string | null {
    const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
    if (host === 'www.sarkariexams.me') return 'https://sarkariexams.me/api';
    if (host === 'sarkariexams.me') return 'https://www.sarkariexams.me/api';
    return null;
}

export function getApiBaseCandidates(configuredApiBaseInput?: string | null, hostname?: string | null): string[] {
    const configuredApiBase = normalizeConfiguredApiBase(configuredApiBaseInput);
    const siblingApiBase = resolveSiblingApiBase(hostname);
    const candidates = [
        ...(configuredApiBase ? [configuredApiBase] : []),
        '/api',
        ...(siblingApiBase ? [siblingApiBase] : []),
    ];

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const candidate of candidates) {
        const normalized = normalizeBase(candidate);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        unique.push(normalized);
    }
    return unique;
}

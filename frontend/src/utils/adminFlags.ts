import { useEffect, useState } from 'react';
import type { AdminUiFlags } from '../types';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return fallback;
};

const envFallbackFlags: AdminUiFlags = {
    admin_nav_ux_v2: parseBoolean(import.meta.env.VITE_FEATURE_ADMIN_NAV_UX_V2, true),
    admin_analytics_ux_v2: parseBoolean(import.meta.env.VITE_FEATURE_ADMIN_ANALYTICS_UX_V2, true),
    admin_lists_ux_v2: parseBoolean(import.meta.env.VITE_FEATURE_ADMIN_LISTS_UX_V2, true),
};

let cachedFlags: AdminUiFlags | null = null;
let inFlightPromise: Promise<AdminUiFlags> | null = null;

export async function loadAdminUiFlags(): Promise<AdminUiFlags> {
    if (cachedFlags) return cachedFlags;
    if (inFlightPromise) return inFlightPromise;

    inFlightPromise = (async () => {
        try {
            const response = await fetch(`${apiBase}/api/health`, {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-store',
                },
            });
            if (!response.ok) {
                cachedFlags = envFallbackFlags;
                return cachedFlags;
            }
            const payload = await response.json().catch(() => null) as {
                meta?: { featureFlags?: Partial<AdminUiFlags> };
            } | null;
            const featureFlags = payload?.meta?.featureFlags ?? {};
            cachedFlags = {
                admin_nav_ux_v2: parseBoolean(featureFlags.admin_nav_ux_v2, envFallbackFlags.admin_nav_ux_v2),
                admin_analytics_ux_v2: parseBoolean(featureFlags.admin_analytics_ux_v2, envFallbackFlags.admin_analytics_ux_v2),
                admin_lists_ux_v2: parseBoolean(featureFlags.admin_lists_ux_v2, envFallbackFlags.admin_lists_ux_v2),
            };
            return cachedFlags;
        } catch {
            cachedFlags = envFallbackFlags;
            return cachedFlags;
        } finally {
            inFlightPromise = null;
        }
    })();

    return inFlightPromise;
}

export function useAdminUiFlags() {
    const [flags, setFlags] = useState<AdminUiFlags>(envFallbackFlags);

    useEffect(() => {
        let mounted = true;
        loadAdminUiFlags().then((nextFlags) => {
            if (!mounted) return;
            setFlags(nextFlags);
        });
        return () => {
            mounted = false;
        };
    }, []);

    return flags;
}


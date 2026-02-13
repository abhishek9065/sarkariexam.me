import { API_BASE } from './constants';

export type FeatureFlagKey =
    | 'search_overlay_v2'
    | 'compare_jobs_v2'
    | 'tracker_api_v2'
    | 'dashboard_widgets_v2';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const envFlag = (name: string, fallback: boolean): boolean => {
    const value = import.meta.env[name];
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const defaults: FeatureFlags = {
    search_overlay_v2: envFlag('VITE_FEATURE_SEARCH_OVERLAY_V2', true),
    compare_jobs_v2: envFlag('VITE_FEATURE_COMPARE_JOBS_V2', true),
    tracker_api_v2: envFlag('VITE_FEATURE_TRACKER_API_V2', true),
    dashboard_widgets_v2: envFlag('VITE_FEATURE_DASHBOARD_WIDGETS_V2', true),
};

let runtimeFlags: FeatureFlags = { ...defaults };
let hydrated = false;

export async function hydrateFeatureFlags(): Promise<FeatureFlags> {
    if (hydrated) return runtimeFlags;
    hydrated = true;

    try {
        const response = await fetch(`${API_BASE}/api/health`, { credentials: 'omit' });
        if (!response.ok) return runtimeFlags;
        const body = await response.json() as {
            meta?: { featureFlags?: Partial<FeatureFlags> };
        };
        const next = body?.meta?.featureFlags;
        if (next && typeof next === 'object') {
            runtimeFlags = { ...runtimeFlags, ...next };
        }
    } catch {
        // Keep defaults when runtime flags are unavailable.
    }

    return runtimeFlags;
}

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    return Boolean(runtimeFlags[flag]);
}

export function getFeatureFlags(): FeatureFlags {
    return { ...runtimeFlags };
}

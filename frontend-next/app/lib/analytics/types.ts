/**
 * Analytics Types
 * Shared types for multi-provider analytics system
 */

export type AnalyticsProviderName = 'ga4' | 'plausible' | 'mixpanel';

export interface AnalyticsEvent {
    event: string;
    data?: Record<string, unknown>;
    timestamp?: number;
}

export interface AnalyticsConfig {
    enabled: boolean;
    providers: {
        ga4?: {
            enabled: boolean;
            measurementId: string;
        };
        plausible?: {
            enabled: boolean;
            domain: string;
        };
        mixpanel?: {
            enabled: boolean;
            token: string;
        };
    };
}

export interface AnalyticsProvider {
    name: string;
    initialize: () => void;
    trackEvent: (event: string, data?: Record<string, unknown>) => void;
    trackPageView: (url: string, title?: string) => void;
    setUser: (userId: string, properties?: Record<string, unknown>) => void;
    clearUser: () => void;
}

export interface PageViewData {
    url: string;
    title?: string;
    referrer?: string;
}

export interface UserProperties {
    userId?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
}

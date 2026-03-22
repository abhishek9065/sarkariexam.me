/**
 * Multi-Provider Analytics System
 * Supports Google Analytics 4, Plausible, and Mixpanel
 */

import { GA4Provider } from './providers/ga4';
import { PlausibleProvider } from './providers/plausible';
import { MixpanelProvider } from './providers/mixpanel';
import type { AnalyticsProvider, AnalyticsConfig } from './types';

class Analytics {
    private providers: AnalyticsProvider[] = [];
    private config: AnalyticsConfig | null = null;
    private initialized = false;

    /**
     * Initialize analytics with configuration
     */
    initialize(config: AnalyticsConfig): void {
        if (this.initialized) {
            console.warn('[Analytics] Already initialized');
            return;
        }

        if (!config.enabled) {
            console.log('[Analytics] Analytics disabled');
            return;
        }

        this.config = config;

        // Initialize GA4
        if (config.providers.ga4?.enabled && config.providers.ga4.measurementId) {
            const ga4 = new GA4Provider(config.providers.ga4.measurementId);
            ga4.initialize();
            this.providers.push(ga4);
        }

        // Initialize Plausible
        if (config.providers.plausible?.enabled && config.providers.plausible.domain) {
            const plausible = new PlausibleProvider(config.providers.plausible.domain);
            plausible.initialize();
            this.providers.push(plausible);
        }

        // Initialize Mixpanel
        if (config.providers.mixpanel?.enabled && config.providers.mixpanel.token) {
            const mixpanel = new MixpanelProvider(config.providers.mixpanel.token);
            mixpanel.initialize();
            this.providers.push(mixpanel);
        }

        this.initialized = true;
        console.log(`[Analytics] Initialized with ${this.providers.length} provider(s)`);
    }

    /**
     * Track a custom event across all providers
     */
    trackEvent(event: string, data?: Record<string, unknown>): void {
        if (!this.initialized || this.providers.length === 0) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[Analytics]', event, data);
            }
            return;
        }

        this.providers.forEach(provider => {
            try {
                provider.trackEvent(event, data);
            } catch (error) {
                console.error(`[Analytics] Error tracking event in ${provider.name}:`, error);
            }
        });
    }

    /**
     * Track a page view across all providers
     */
    trackPageView(url: string, title?: string): void {
        if (!this.initialized || this.providers.length === 0) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[Analytics] Page view:', url, title);
            }
            return;
        }

        this.providers.forEach(provider => {
            try {
                provider.trackPageView(url, title);
            } catch (error) {
                console.error(`[Analytics] Error tracking page view in ${provider.name}:`, error);
            }
        });
    }

    /**
     * Set user identification across all providers
     */
    setUser(userId: string, properties?: Record<string, unknown>): void {
        if (!this.initialized || this.providers.length === 0) return;

        this.providers.forEach(provider => {
            try {
                provider.setUser(userId, properties);
            } catch (error) {
                console.error(`[Analytics] Error setting user in ${provider.name}:`, error);
            }
        });
    }

    /**
     * Clear user identification across all providers
     */
    clearUser(): void {
        if (!this.initialized || this.providers.length === 0) return;

        this.providers.forEach(provider => {
            try {
                provider.clearUser();
            } catch (error) {
                console.error(`[Analytics] Error clearing user in ${provider.name}:`, error);
            }
        });
    }

    /**
     * Check if analytics is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get active providers
     */
    getProviders(): string[] {
        return this.providers.map(p => p.name);
    }
}

// Create singleton instance
const analytics = new Analytics();

// Export singleton and helper functions
export { analytics };

/**
 * Helper function to track events
 * Use this in components instead of calling analytics directly
 */
export function trackEvent(event: string, data?: Record<string, unknown>): void {
    analytics.trackEvent(event, data);
}

/**
 * Helper function to track page views
 */
export function trackPageView(url: string, title?: string): void {
    analytics.trackPageView(url, title);
}

/**
 * Helper function to set user
 */
export function setUser(userId: string, properties?: Record<string, unknown>): void {
    analytics.setUser(userId, properties);
}

/**
 * Helper function to clear user
 */
export function clearUser(): void {
    analytics.clearUser();
}

/**
 * Initialize analytics from environment variables
 */
export function initializeAnalytics(): void {
    const config: AnalyticsConfig = {
        enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
        providers: {
            ga4: {
                enabled: !!process.env.NEXT_PUBLIC_GA4_ID,
                measurementId: process.env.NEXT_PUBLIC_GA4_ID || '',
            },
            plausible: {
                enabled: !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
                domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
            },
            mixpanel: {
                enabled: !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
                token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
            },
        },
    };

    analytics.initialize(config);
}

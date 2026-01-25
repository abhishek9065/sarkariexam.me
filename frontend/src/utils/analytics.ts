import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics Measurement ID - Replace with your own
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX';

// Initialize GA4
declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

/**
 * Load Google Analytics script
 */
export function loadGoogleAnalytics() {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag === 'function') return; // Already loaded

    // Load the script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
        window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: window.location.pathname,
    });
}

/**
 * Track page views on route changes
 */
export function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        if (typeof window.gtag !== 'undefined') {
            window.gtag('config', GA_MEASUREMENT_ID, {
                page_path: location.pathname + location.search,
            });
        }
    }, [location]);
}

/**
 * Track custom events
 */
export function trackEvent(action: string, category: string, label?: string, value?: number) {
    if (typeof window.gtag !== 'undefined') {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
}

/**
 * Common events for Sarkari Result
 */
export const Analytics = {
    // Job interactions
    viewJob: (jobTitle: string) => trackEvent('view_job', 'engagement', jobTitle),
    applyJob: (jobTitle: string) => trackEvent('apply_job', 'engagement', jobTitle),
    bookmarkJob: (jobTitle: string) => trackEvent('bookmark', 'engagement', jobTitle),
    shareJob: (jobTitle: string, platform: string) => trackEvent('share', platform, jobTitle),

    // User actions
    search: (query: string) => trackEvent('search', 'navigation', query),
    filter: (filterType: string, value: string) => trackEvent('filter', 'navigation', `${filterType}:${value}`),
    subscribe: (type: 'email' | 'push') => trackEvent('subscribe', 'conversion', type),

    // PWA
    installPWA: () => trackEvent('install', 'pwa', 'app_installed'),
    darkModeToggle: (enabled: boolean) => trackEvent('toggle_dark_mode', 'settings', enabled ? 'on' : 'off'),
};

export default Analytics;

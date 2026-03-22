'use client';

import { useEffect } from 'react';
import { initializeAnalytics } from '@/app/lib/analytics';

/**
 * Analytics Initializer Component
 * Initializes all analytics providers on app mount
 */
export function AnalyticsInitializer() {
    useEffect(() => {
        initializeAnalytics();
    }, []);

    return null;
}

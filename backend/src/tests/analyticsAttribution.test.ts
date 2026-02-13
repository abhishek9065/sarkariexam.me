import { describe, expect, it } from 'vitest';

import { normalizeAttribution } from '../services/attribution.js';

describe('analytics attribution normalization', () => {
    it('uses utm_* fields with precedence over plain params', () => {
        const attribution = normalizeAttribution({
            source: 'social',
            utmSource: 'email',
            medium: 'referral',
            utmMedium: 'newsletter',
            campaign: 'fallback_campaign',
            utmCampaign: 'spring_jobs',
        });

        expect(attribution.source).toBe('email');
        expect(attribution.medium).toBe('email');
        expect(attribution.campaign).toBe('spring_jobs');
    });

    it('classifies direct traffic correctly', () => {
        const attribution = normalizeAttribution({
            source: 'direct',
        });

        expect(attribution.source).toBe('direct');
        expect(attribution.sourceClass).toBe('direct');
        expect(attribution.isDigest).toBe(false);
    });

    it('maps in-app aliases to canonical values', () => {
        const attribution = normalizeAttribution({
            source: 'search-overlay',
        });

        expect(attribution.source).toBe('search_overlay');
        expect(attribution.sourceClass).toBe('in_app');
    });

    it('infers digest clicks from digest params when source is absent', () => {
        const attribution = normalizeAttribution({
            campaign: 'daily_digest_jobs',
            digest: 'daily',
        });

        expect(attribution.source).toBe('digest');
        expect(attribution.digestType).toBe('daily');
        expect(attribution.sourceClass).toBe('direct');
        expect(attribution.isDigest).toBe(true);
    });

    it('buckets unknown sources into unknown', () => {
        const attribution = normalizeAttribution({
            source: 'affiliate_network_partner',
        });

        expect(attribution.source).toBe('unknown');
        expect(attribution.sourceClass).toBe('unknown');
    });
});


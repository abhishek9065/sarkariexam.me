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

    it('classifies active frontend source tags as in-app', () => {
        const sourceTags = [
            'home_featured',
            'home_admission_extended',
            'home_column_jobs',
            'home_column_results',
            'home_column_admit',
            'home_horizontal_answer_key',
            'home_horizontal_syllabus',
            'home_horizontal_admission',
            'home_horizontal_important',
            'home_box_jobs',
            'home_box_results',
            'home_box_admit',
            'home_box_answer_key',
            'home_box_syllabus',
            'home_box_admission',
            'home_box_important',
            'home_box_certificate',
            'category_list',
            'category_compact',
            'search_overlay',
            'detail_related',
            'bookmarks_grid',
            'bookmarks_compact',
            'profile_notifications',
            'profile_tracked',
            'header_trending',
        ];

        for (const sourceTag of sourceTags) {
            const attribution = normalizeAttribution({ source: sourceTag });
            expect(attribution.sourceClass).toBe('in_app');
            expect(attribution.source).not.toBe('unknown');
        }
    });
});


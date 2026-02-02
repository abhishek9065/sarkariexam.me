import { Router } from 'express';
import { z } from 'zod';

import { cacheMiddleware, cacheKeys } from '../middleware/cache.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

const router = Router();

const matchQuerySchema = z.object({
    age: z.coerce.number().int().min(15).max(80),
    qualification: z.string().trim().min(1),
    location: z.string().trim().min(1),
    category: z.string().trim().optional(),
    gender: z.string().trim().optional(),
});

function parseAgeRange(ageLimit?: string): { min?: number; max?: number } {
    if (!ageLimit) return {};
    const numbers = ageLimit.match(/\d+/g)?.map(num => parseInt(num, 10)) || [];
    if (numbers.length >= 2) return { min: numbers[0], max: numbers[1] };
    if (numbers.length === 1) return { max: numbers[0] };
    return {};
}

function normalize(value?: string): string {
    return (value || '').toLowerCase();
}

router.get('/match', cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.jobMatch }), async (req, res) => {
    const parseResult = matchQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ 
            error: 'Invalid query parameters',
            details: parseResult.error.flatten().fieldErrors
        });
    }

    const { age, qualification, location, category, gender } = parseResult.data;
    const normalizedQualification = normalize(qualification);
    const normalizedLocation = normalize(location);

    try {
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Job matching timeout')), 10000);
        });

        const jobsPromise = AnnouncementModelMongo.findAll({ 
            type: 'job', 
            limit: 200
        });

        const jobs = await Promise.race([jobsPromise, timeoutPromise]) as any[];

        if (!Array.isArray(jobs) || jobs.length === 0) {
            return res.json({ 
                data: [],
                message: 'No matching jobs found',
                queryInfo: { age, qualification, location, category, gender }
            });
        }

        const matches = jobs.map(job => {
            let score = 0;
            const reasons: string[] = [];

            // Qualification matching with better scoring
            const jobQualification = normalize(job.minQualification);
            if (jobQualification) {
                if (jobQualification.includes(normalizedQualification)) {
                    score += 40;
                    reasons.push('Qualification match');
                } else if (normalizedQualification.includes(jobQualification)) {
                    score += 30;
                    reasons.push('Qualification compatible');
                }
            }

            // Location matching with priority for exact matches
            const jobLocation = normalize(job.location || 'all india');
            if (normalizedLocation === 'all india' || jobLocation.includes('all india')) {
                score += 15;
                reasons.push('National eligibility');
            } else if (jobLocation.includes(normalizedLocation)) {
                score += 25;
                reasons.push('Location match');
            } else if (normalizedLocation.includes(jobLocation)) {
                score += 20;
                reasons.push('Location compatible');
            }

            // Category matching
            if (category) {
                const jobCategory = normalize(job.category || '');
                if (jobCategory.includes(normalize(category)) || normalize(category).includes(jobCategory)) {
                    score += 15;
                    reasons.push('Category match');
                }
            }

            // Age eligibility with better validation
            const ageRange = parseAgeRange(job.ageLimit);
            if (!ageRange.min && !ageRange.max) {
                score += 5; // No age restriction
            } else {
                const minAge = ageRange.min || 15;
                const maxAge = ageRange.max || 80;
                if (age >= minAge && age <= maxAge) {
                    score += 20;
                    reasons.push('Age eligibility');
                } else {
                    // Penalty for age mismatch
                    score = Math.max(0, score - 10);
                }
            }

            // Gender matching if specified
            if (gender && job.gender) {
                const jobGender = normalize(job.gender);
                const userGender = normalize(gender);
                if (jobGender === userGender || jobGender.includes('any') || jobGender.includes('both')) {
                    score += 10;
                    reasons.push('Gender eligibility');
                }
            }

            return { job, score, reasons };
        });

        const result = matches
            .filter(item => item.score > 0)
            .sort((a, b) => {
                // Sort by score first, then by date
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.job.createdAt || 0).getTime() - new Date(a.job.createdAt || 0).getTime();
            })
            .slice(0, 50)
            .map(item => ({
                ...item.job,
                matchScore: Math.min(100, Math.max(0, item.score)),
                matchReasons: item.reasons.length > 0 ? item.reasons : ['General match'],
                relevanceRank: matches.indexOf(item) + 1
            }));

        return res.json({ 
            data: result,
            totalMatches: matches.filter(item => item.score > 0).length,
            queryInfo: { age, qualification, location, category, gender }
        });
    } catch (error) {
        console.error('Job match error:', error);
        
        // Return more detailed error information
        if (error instanceof Error) {
            if (error.message === 'Job matching timeout') {
                return res.status(504).json({ 
                    error: 'Request timeout',
                    message: 'Job matching took too long. Please try again.'
                });
            }
        }
        
        return res.status(500).json({ 
            error: 'Failed to match jobs',
            message: 'An internal error occurred while processing your request.'
        });
    }
});

export default router;

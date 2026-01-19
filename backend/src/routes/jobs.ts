import { Router } from 'express';
import { z } from 'zod';

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

router.get('/match', async (req, res) => {
    const parseResult = matchQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { age, qualification, location } = parseResult.data;
    const normalizedQualification = normalize(qualification);
    const normalizedLocation = normalize(location);

    try {
        const jobs = await AnnouncementModelMongo.findAll({ type: 'job', limit: 200 });

        const matches = jobs.map(job => {
            let score = 0;
            const reasons: string[] = [];

            const jobQualification = normalize(job.minQualification);
            if (jobQualification && (jobQualification.includes(normalizedQualification) || normalizedQualification.includes(jobQualification))) {
                score += 40;
                reasons.push('Qualification match');
            }

            const jobLocation = normalize(job.location || 'all india');
            if (normalizedLocation === 'all india' || jobLocation.includes(normalizedLocation) || jobLocation.includes('all india')) {
                score += 20;
                reasons.push('Location match');
            }

            const ageRange = parseAgeRange(job.ageLimit);
            if (!ageRange.min && !ageRange.max) {
                score += 10;
            } else if ((ageRange.min ? age >= ageRange.min : true) && (ageRange.max ? age <= ageRange.max : true)) {
                score += 20;
                reasons.push('Age eligibility');
            }

            return { job, score, reasons };
        });

        const result = matches
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)
            .map(item => ({
                ...item.job,
                matchScore: Math.min(100, item.score),
                matchReasons: item.reasons.length > 0 ? item.reasons : ['General match'],
            }));

        return res.json({ data: result });
    } catch (error) {
        console.error('Job match error:', error);
        return res.status(500).json({ error: 'Failed to match jobs' });
    }
});

export default router;

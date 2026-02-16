import { z } from 'zod';

import { terminateAdminSession, terminateOtherSessions } from '../adminSessions.js';

const terminateSessionSchema = z.object({
    sessionId: z.string().min(8),
});

export async function terminateSessionById(payload: unknown): Promise<{ success: boolean }> {
    const parsed = terminateSessionSchema.parse(payload);
    const success = await terminateAdminSession(parsed.sessionId);
    return { success };
}

export async function terminateAllOtherSessions(input: { userId: string; currentSessionId?: string | null }) {
    const terminatedCount = await terminateOtherSessions(input.userId, input.currentSessionId);
    return { terminatedCount };
}

import { resolvePublicApiBase } from './api';

interface SubscribeToAlertsInput {
  email: string;
  categories?: string[];
  states?: string[];
  organizations?: string[];
  qualifications?: string[];
  postTypes?: Array<'job' | 'result' | 'admit-card' | 'admission' | 'answer-key' | 'syllabus'>;
  frequency?: 'instant' | 'daily' | 'weekly';
  source?: string;
}

export async function subscribeToAlerts(input: SubscribeToAlertsInput) {
  let response: Response;

  try {
    response = await fetch(`${resolvePublicApiBase()}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    return {
      data: { verified: false },
      message: 'Preview mode: alert API is not connected yet.',
    };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      typeof body === 'object' && body && 'error' in body
        ? String((body as Record<string, unknown>).error)
        : 'Failed to subscribe';
    throw new Error(errorMessage);
  }

  return body as { data?: { verified?: boolean }; message?: string };
}

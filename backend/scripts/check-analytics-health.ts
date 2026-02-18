interface AnalyticsHealthFlags {
    zeroListingEvents: boolean;
    staleRollups: boolean;
    inAppClickCollapse: boolean;
    staleThresholdMinutes: number;
}

interface AnalyticsHealthPayload {
    data?: {
        insights?: {
            healthFlags?: Partial<AnalyticsHealthFlags>;
            rollupAgeMinutes?: number | null;
        };
        anomalies?: unknown[];
    };
}

const endpoint = process.env.ANALYTICS_HEALTH_URL || 'http://localhost:5000/api/analytics/overview?days=30&nocache=1';
const token = process.env.ANALYTICS_HEALTH_TOKEN;

const headers: Record<string, string> = {
    Accept: 'application/json',
};

if (token) {
    headers.Authorization = `Bearer ${token}`;
}

const response = await fetch(endpoint, { headers });
if (!response.ok) {
    const body = await response.text();
    console.error(JSON.stringify({
        ok: false,
        endpoint,
        status: response.status,
        body,
    }, null, 2));
    process.exit(1);
}

const payload = await response.json() as AnalyticsHealthPayload;
const flags = payload.data?.insights?.healthFlags;

if (!flags) {
    console.error(JSON.stringify({
        ok: false,
        endpoint,
        reason: 'Missing insights.healthFlags in response payload',
    }, null, 2));
    process.exit(1);
}

const normalizedFlags: AnalyticsHealthFlags = {
    zeroListingEvents: Boolean(flags.zeroListingEvents),
    staleRollups: Boolean(flags.staleRollups),
    inAppClickCollapse: Boolean(flags.inAppClickCollapse),
    staleThresholdMinutes: Number(flags.staleThresholdMinutes ?? 0),
};

const unhealthy =
    normalizedFlags.zeroListingEvents
    || normalizedFlags.staleRollups
    || normalizedFlags.inAppClickCollapse;

const output = {
    ok: !unhealthy,
    endpoint,
    checkedAt: new Date().toISOString(),
    rollupAgeMinutes: payload.data?.insights?.rollupAgeMinutes ?? null,
    anomalyCount: Array.isArray(payload.data?.anomalies) ? payload.data?.anomalies?.length : 0,
    flags: normalizedFlags,
};

console.log(JSON.stringify(output, null, 2));

if (unhealthy) {
    process.exit(1);
}

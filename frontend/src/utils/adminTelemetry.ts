export type AdminTelemetryEventType =
    | 'admin_list_loaded'
    | 'admin_filter_applied'
    | 'admin_row_action_clicked'
    | 'admin_review_decision_submitted'
    | 'admin_bulk_preview_opened'
    | 'admin_metric_drilldown_opened';

type TelemetryPayload = {
    type: AdminTelemetryEventType;
    metadata?: Record<string, unknown>;
};

const apiBase = import.meta.env.VITE_API_BASE ?? '';

const getAuthToken = (providedToken?: string | null) => {
    if (providedToken) return providedToken;
    try {
        return localStorage.getItem('token') || localStorage.getItem('adminToken');
    } catch {
        return null;
    }
};

export async function trackAdminTelemetry(
    payload: TelemetryPayload,
    token?: string | null
): Promise<void> {
    try {
        const authToken = getAuthToken(token);
        await fetch(`${apiBase}/api/admin/telemetry/events`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify(payload),
        });
    } catch {
        // telemetry must never block primary workflows
    }
}


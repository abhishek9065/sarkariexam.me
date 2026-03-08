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

export async function trackAdminTelemetry(payload: TelemetryPayload): Promise<void> {
    try {
        await fetch(`${apiBase}/api/admin/telemetry/events`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch {
        // telemetry must never block primary workflows
    }
}


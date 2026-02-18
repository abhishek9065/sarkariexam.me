export type AdminTelemetryEventType =
    | 'admin_list_loaded'
    | 'admin_filter_applied'
    | 'admin_row_action_clicked'
    | 'admin_review_decision_submitted'
    | 'admin_bulk_preview_opened'
    | 'admin_metric_drilldown_opened'
    | 'admin_module_viewed'
    | 'admin_incident_action'
    | 'admin_session_action'
    | 'admin_triage_action';

export async function trackAdminTelemetry(type: AdminTelemetryEventType, metadata?: Record<string, unknown>) {
    try {
        await fetch('/api/admin/telemetry/events', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type,
                metadata,
            }),
        });
    } catch {
        // Telemetry is best-effort only.
    }
}

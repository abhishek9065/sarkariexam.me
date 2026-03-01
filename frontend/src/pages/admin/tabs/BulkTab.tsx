export type BulkTabProps = {
    bulkJson: string;
    setBulkJson: (v: string) => void;
    isLoggedIn: boolean;
    setMessage: (msg: string) => void;
    adminFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    refreshData: () => void;
    refreshDashboard: () => void;
    apiBase: string;
};

export function BulkTab({
    bulkJson,
    setBulkJson,
    isLoggedIn,
    setMessage,
    adminFetch,
    refreshData,
    refreshDashboard,
    apiBase,
}: BulkTabProps) {
    return (
        <div className="admin-form-container">
            <h3>Bulk Import Announcements</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                Paste JSON array of announcements below. Required fields: title, type, category, organization.
            </p>
            <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={`{
"announcements": [
  {
    "title": "SSC CGL 2025",
    "type": "job",
    "category": "Central Government",
    "organization": "SSC",
    "totalPosts": 5000
  }
]
}`}
                style={{
                    width: '100%',
                    height: '300px',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    padding: '15px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    marginBottom: '15px',
                }}
            />
            <button
                className="admin-btn primary"
                onClick={async () => {
                    if (!isLoggedIn) {
                        setMessage('Not authenticated');
                        return;
                    }
                    try {
                        const jsonData = JSON.parse(bulkJson);
                        const response = await adminFetch(`${apiBase}/api/bulk/import`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(jsonData),
                        });
                        const result = await response.json();
                        setMessage(result.message || 'Import complete');
                        if (response.ok) {
                            refreshData();
                            refreshDashboard();
                            setBulkJson('');
                        }
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : String(err);
                        setMessage('Invalid JSON: ' + message);
                    }
                }}
            >
                Import Announcements
            </button>
        </div>
    );
}

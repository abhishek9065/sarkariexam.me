import type {
    DashboardData,
} from '../adminTypes';
import { ACTIVE_USER_WINDOWS } from '../adminConstants';
import { formatLastUpdated } from '../adminHelpers';

type ActiveUsersData = {
    windowMinutes: number;
    since: string;
    total: number;
    authenticated: number;
    anonymous: number;
    admins: number;
} | null;

export type UsersTabProps = {
    dashboard: DashboardData | null;
    dashboardLoading: boolean;
    dashboardError: string | null;
    dashboardUpdatedAt: string | null;
    refreshDashboard: () => void;
    activeUsers: ActiveUsersData;
    activeUsersWindow: number;
    setActiveUsersWindow: (v: number) => void;
    activeUsersLoading: boolean;
    activeUsersError: string | null;
    activeUsersUpdatedAt: string | null;
    refreshActiveUsers: () => void;
};

export function UsersTab({
    dashboard,
    dashboardLoading,
    dashboardError,
    dashboardUpdatedAt,
    refreshDashboard,
    activeUsers,
    activeUsersWindow,
    setActiveUsersWindow,
    activeUsersLoading,
    activeUsersError,
    activeUsersUpdatedAt,
    refreshActiveUsers,
}: UsersTabProps) {
    return (
        <div className="admin-users">
            <div className="admin-list-header">
                <div>
                    <h3>User analytics</h3>
                    <p className="admin-subtitle">Track subscriber growth and engagement.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(dashboardUpdatedAt)}</span>
                    <button className="admin-btn secondary" onClick={refreshDashboard} disabled={dashboardLoading}>
                        {dashboardLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {dashboardLoading ? (
                <div className="admin-loading">Loading user analytics...</div>
            ) : dashboardError ? (
                <div className="admin-error">{dashboardError}</div>
            ) : (
                <div className="admin-user-grid">
                    <div className="user-card">
                        <div className="card-label">Total users</div>
                        <div className="card-value">{dashboard?.users?.totalUsers ?? 0}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">New today</div>
                        <div className="card-value accent">{dashboard?.users?.newToday ?? 0}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">New this week</div>
                        <div className="card-value accent">{dashboard?.users?.newThisWeek ?? 0}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">Active subscribers</div>
                        <div className="card-value">{dashboard?.users?.activeSubscribers ?? 0}</div>
                    </div>
                </div>
            )}

            <div className="admin-section-panel">
                <div className="admin-list-header">
                    <div>
                        <h4>Current users</h4>
                        <p className="admin-subtitle">Activity in the last {activeUsersWindow} minutes.</p>
                    </div>
                    <div className="admin-list-actions">
                        <label htmlFor="activeWindow" className="admin-inline-label">Window</label>
                        <select
                            id="activeWindow"
                            value={activeUsersWindow}
                            onChange={(e) => setActiveUsersWindow(parseInt(e.target.value))}
                        >
                            {ACTIVE_USER_WINDOWS.map((w: number) => (
                                <option key={w} value={w}>{w}m</option>
                            ))}
                        </select>
                        <span className="admin-updated">{formatLastUpdated(activeUsersUpdatedAt)}</span>
                        <button className="admin-btn secondary" onClick={refreshActiveUsers} disabled={activeUsersLoading}>
                            {activeUsersLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {activeUsersLoading ? (
                    <div className="admin-loading">Loading active users...</div>
                ) : activeUsers ? (
                    <div className="admin-user-grid">
                        <div className="user-card">
                            <div className="card-label">Active now</div>
                            <div className="card-value">{activeUsers.total}</div>
                        </div>
                        <div className="user-card">
                            <div className="card-label">Authenticated</div>
                            <div className="card-value">{activeUsers.authenticated}</div>
                        </div>
                        <div className="user-card">
                            <div className="card-label">Anonymous</div>
                            <div className="card-value">{activeUsers.anonymous}</div>
                        </div>
                        <div className="user-card">
                            <div className="card-label">Admins</div>
                            <div className="card-value">{activeUsers.admins}</div>
                        </div>
                    </div>
                ) : (
                    <div className="admin-error">{activeUsersError ?? 'Unable to load active users.'}</div>
                )}
            </div>
        </div>
    );
}

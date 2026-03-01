import { Suspense, lazy } from 'react';
import type { AdminSession, BackupCodesStatus } from '../adminTypes';

const SessionManager = lazy(() =>
    import('../../../components/admin/SessionManager').then((module) => ({ default: module.SessionManager }))
);
const SecurityLogsTable = lazy(() =>
    import('../../../components/admin/SecurityLogsTable').then((module) => ({ default: module.SecurityLogsTable }))
);

export type SecurityTabProps = {
    sessions: AdminSession[];
    sessionsLoading: boolean;
    sessionsError: string | null;
    activeSessionCount: number;
    highRiskSessionCount: number;
    backupCodesStatus: BackupCodesStatus | null;
    backupCodesLoading: boolean;
    refreshSessions: () => Promise<void>;
    terminateSession: (id: string) => Promise<void>;
    terminateOtherSessions: () => Promise<void>;
    refreshBackupCodesStatus: () => void | Promise<void>;
    generateBackupCodes: () => void;
    formatDateTime: (value?: string | Date | null) => string;
    handleUnauthorized: (reason?: string) => void;
    canWriteAdmin: boolean;
};

export function SecurityTab({
    sessions,
    sessionsLoading,
    sessionsError,
    activeSessionCount,
    highRiskSessionCount,
    backupCodesStatus,
    backupCodesLoading,
    refreshSessions,
    terminateSession,
    terminateOtherSessions,
    refreshBackupCodesStatus,
    generateBackupCodes,
    formatDateTime,
    handleUnauthorized,
    canWriteAdmin,
}: SecurityTabProps) {
    return (
        <div className="admin-security">
            <div className="admin-security-grid">
                <div className="admin-security-card">
                    <div className="security-card-header">
                        <div>
                            <h4>Two-factor recovery</h4>
                            <p className="admin-subtitle">Generate backup codes for account recovery.</p>
                        </div>
                        <span className="security-card-pill">
                            {backupCodesStatus
                                ? `${backupCodesStatus.remaining}/${backupCodesStatus.total} remaining`
                                : 'Not generated'}
                        </span>
                    </div>
                    <div className="security-card-body">
                        <div className="security-stat">
                            <span className="stat-label">Backup codes remaining</span>
                            <span className="stat-value">{backupCodesStatus?.remaining ?? 0}</span>
                        </div>
                        <div className="security-stat">
                            <span className="stat-label">Last generated</span>
                            <span className="stat-value">
                                {backupCodesStatus?.updatedAt ? formatDateTime(backupCodesStatus.updatedAt) : 'Not generated'}
                            </span>
                        </div>
                    </div>
                    <div className="security-card-actions">
                        {canWriteAdmin && (
                            <button
                                className="admin-btn primary small"
                                onClick={generateBackupCodes}
                                disabled={backupCodesLoading}
                            >
                                {backupCodesLoading ? 'Generating\u2026' : 'Generate backup codes'}
                            </button>
                        )}
                        <button
                            className="admin-btn secondary small"
                            onClick={refreshBackupCodesStatus}
                            disabled={backupCodesLoading}
                        >
                            Refresh status
                        </button>
                    </div>
                    <p className="security-card-note">
                        Generate a new set to invalidate old codes and store them somewhere safe.
                    </p>
                </div>

                <div className="admin-security-card">
                    <div className="security-card-header">
                        <div>
                            <h4>Session health</h4>
                            <p className="admin-subtitle">Monitor active sessions and risk signals.</p>
                        </div>
                        <span className="security-card-pill">{sessions.length} total</span>
                    </div>
                    <div className="security-card-body">
                        <div className="security-stat">
                            <span className="stat-label">Active now</span>
                            <span className="stat-value">{activeSessionCount}</span>
                        </div>
                        <div className="security-stat">
                            <span className="stat-label">High risk</span>
                            <span className="stat-value">{highRiskSessionCount}</span>
                        </div>
                    </div>
                    <div className="security-card-actions">
                        <button
                            className="admin-btn secondary small"
                            onClick={refreshSessions}
                            disabled={sessionsLoading}
                        >
                            {sessionsLoading ? 'Refreshing\u2026' : 'Refresh sessions'}
                        </button>
                        {sessions.length > 1 && (
                            <button
                                className="admin-btn warning small"
                                onClick={terminateOtherSessions}
                                disabled={sessionsLoading || !canWriteAdmin}
                            >
                                End other sessions
                            </button>
                        )}
                    </div>
                    <p className="security-card-note">
                        Terminate unknown sessions immediately if you see unfamiliar devices.
                    </p>
                </div>
            </div>

            {sessionsError && <div className="admin-error">{sessionsError}</div>}

            <Suspense fallback={<div className="admin-loading">Loading sessions...</div>}>
                <SessionManager
                    sessions={sessions}
                    onTerminateSession={terminateSession}
                    onTerminateAllOther={terminateOtherSessions}
                    onRefresh={refreshSessions}
                    loading={sessionsLoading}
                    canManage={canWriteAdmin}
                />
            </Suspense>

            <Suspense fallback={<div className="admin-loading">Loading security logs...</div>}>
                <SecurityLogsTable onUnauthorized={handleUnauthorized} />
            </Suspense>
        </div>
    );
}

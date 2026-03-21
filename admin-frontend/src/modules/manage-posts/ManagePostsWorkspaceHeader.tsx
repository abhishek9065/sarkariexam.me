import type { AdminManagePostsWorkspaceSnapshot } from '../../types';

type SummaryCard = {
    key: string;
    label: string;
    value: number | string;
    hint: string;
};

type ManagePostsWorkspaceHeaderProps = {
    workspace: AdminManagePostsWorkspaceSnapshot;
    summaryCards: SummaryCard[];
    activeLaneId: string;
    onSelectLane: (laneId: string) => void;
    formatDateTime: (value?: string | null) => string;
};

export function ManagePostsWorkspaceHeader({
    workspace,
    summaryCards,
    activeLaneId,
    onSelectLane,
    formatDateTime,
}: ManagePostsWorkspaceHeaderProps) {
    return (
        <>
            <div className="ops-kpi-grid">
                {summaryCards.map((card) => (
                    <div key={card.key} className="ops-kpi-card">
                        <div className="ops-kpi-label">{card.label}</div>
                        <div className="ops-kpi-value">{card.value}</div>
                        <div className="ops-kpi-trend neutral">{card.hint}</div>
                    </div>
                ))}
            </div>
            <div className="ops-actions" aria-label="Manage post lanes">
                {workspace.lanes.map((lane) => (
                    <button
                        key={lane.id}
                        type="button"
                        className={`admin-btn small ${activeLaneId === lane.id ? 'primary' : 'subtle'}`}
                        onClick={() => onSelectLane(lane.id)}
                    >
                        {lane.label} ({lane.count})
                    </button>
                ))}
                <span className="ops-inline-muted">Workspace refreshed {formatDateTime(workspace.generatedAt)}</span>
            </div>
        </>
    );
}

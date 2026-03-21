import type { AdminManagePostsWorkspaceSnapshot } from '../../types';
import { ActionBar } from '../../components/workspace';

type ManagePostsWorkspaceHeaderProps = {
    workspace: AdminManagePostsWorkspaceSnapshot;
    activeLaneId: string;
    onSelectLane: (laneId: string) => void;
    formatDateTime: (value?: string | null) => string;
};

export function ManagePostsWorkspaceHeader({
    workspace,
    activeLaneId,
    onSelectLane,
    formatDateTime,
}: ManagePostsWorkspaceHeaderProps) {
    return (
        <>
            <ActionBar aria-label="Manage post lanes">
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
            </ActionBar>
        </>
    );
}

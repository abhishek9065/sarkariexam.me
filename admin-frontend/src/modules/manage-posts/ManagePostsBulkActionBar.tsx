import { LIMIT_OPTIONS } from './useManagePostsState';
import type { AdminSavedView } from '../../types';

type BulkAction = 'submit-review' | 'publish' | 'mark-expired' | 'pin-home';

type ManagePostsBulkActionBarProps = {
    limit: number;
    onLimitChange: (value: number) => void;
    canWrite: boolean;
    canApprove: boolean;
    hasValidStepUp: boolean;
    selectedIdsCount: number;
    bulkPending: boolean;
    previewingAction: BulkAction | null;
    onRunBulkAction: (action: BulkAction) => void;
    selectedView?: AdminSavedView;
    canEditSelectedView: boolean;
    canDeleteSelectedView: boolean;
    onEditSelectedView: () => void;
    onDeleteSelectedView: () => void;
    deletePending: boolean;
};

export function ManagePostsBulkActionBar({
    limit,
    onLimitChange,
    canWrite,
    canApprove,
    hasValidStepUp,
    selectedIdsCount,
    bulkPending,
    previewingAction,
    onRunBulkAction,
    selectedView,
    canEditSelectedView,
    canDeleteSelectedView,
    onEditSelectedView,
    onDeleteSelectedView,
    deletePending,
}: ManagePostsBulkActionBarProps) {
    return (
        <div className="ops-actions">
            <label className="ops-inline-muted" htmlFor="admin-list-limit">Rows per page</label>
            <select
                id="admin-list-limit"
                value={limit}
                onChange={(event) => {
                    const nextLimit = Number(event.target.value);
                    if (!LIMIT_OPTIONS.includes(nextLimit)) return;
                    onLimitChange(nextLimit);
                }}
            >
                {LIMIT_OPTIONS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                ))}
            </select>
            {canWrite ? (
                <>
                    <button
                        type="button"
                        className="admin-btn small"
                        onClick={() => onRunBulkAction('submit-review')}
                        disabled={selectedIdsCount === 0 || bulkPending || previewingAction !== null || !hasValidStepUp}
                    >
                        Submit for review
                    </button>
                    {canApprove ? (
                        <button
                            type="button"
                            className="admin-btn small"
                            onClick={() => onRunBulkAction('publish')}
                            disabled={selectedIdsCount === 0 || bulkPending || previewingAction !== null || !hasValidStepUp}
                        >
                            Publish (step-up)
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="admin-btn small subtle"
                        onClick={() => onRunBulkAction('mark-expired')}
                        disabled={selectedIdsCount === 0 || bulkPending || previewingAction !== null || !hasValidStepUp}
                    >
                        Mark expired
                    </button>
                    <button
                        type="button"
                        className="admin-btn small subtle"
                        onClick={() => onRunBulkAction('pin-home')}
                        disabled={selectedIdsCount === 0 || bulkPending || previewingAction !== null || !hasValidStepUp}
                    >
                        Pin to homepage
                    </button>
                </>
            ) : null}
            {selectedView && canEditSelectedView ? (
                <button
                    type="button"
                    className="admin-btn small"
                    onClick={onEditSelectedView}
                >
                    Update selected view
                </button>
            ) : null}
            {selectedView && canDeleteSelectedView ? (
                <button
                    type="button"
                    className="admin-btn small danger"
                    onClick={onDeleteSelectedView}
                    disabled={deletePending}
                >
                    Delete selected view
                </button>
            ) : null}
        </div>
    );
}

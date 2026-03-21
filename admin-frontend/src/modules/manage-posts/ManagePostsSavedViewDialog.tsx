type ManagePostsSavedViewDialogProps = {
    open: boolean;
    mode: 'create' | 'update';
    name: string;
    scope: 'private' | 'shared';
    canManageSharedViews: boolean;
    pending: boolean;
    onClose: () => void;
    onNameChange: (value: string) => void;
    onScopeChange: (value: 'private' | 'shared') => void;
    onSubmit: () => void;
};

export function ManagePostsSavedViewDialog({
    open,
    mode,
    name,
    scope,
    canManageSharedViews,
    pending,
    onClose,
    onNameChange,
    onScopeChange,
    onSubmit,
}: ManagePostsSavedViewDialogProps) {
    if (!open) return null;

    return (
        <div className="ops-modal-overlay" role="presentation" onClick={onClose}>
            <div className="ops-modal" role="dialog" aria-modal="true" aria-label="Save list view" onClick={(event) => event.stopPropagation()}>
                <h3>{mode === 'update' ? 'Update Saved View' : 'Save Current View'}</h3>
                <p className="ops-inline-muted">
                    Private views are personal workspace tools. Shared views remain admin-only and are visible across the team.
                </p>
                <div className="ops-form-grid two">
                    <input
                        value={name}
                        onChange={(event) => onNameChange(event.target.value)}
                        placeholder="View name"
                        minLength={2}
                        maxLength={120}
                    />
                    {canManageSharedViews ? (
                        <select
                            value={scope}
                            onChange={(event) => onScopeChange(event.target.value as 'private' | 'shared')}
                        >
                            <option value="private">Private (only me)</option>
                            <option value="shared">Shared (admins)</option>
                        </select>
                    ) : (
                        <input value="Private (only me)" disabled readOnly />
                    )}
                </div>
                <div className="ops-actions">
                    <button type="button" className="admin-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="admin-btn primary"
                        onClick={onSubmit}
                        disabled={pending}
                    >
                        {pending ? (mode === 'update' ? 'Updating...' : 'Saving...') : (mode === 'update' ? 'Update View' : 'Save View')}
                    </button>
                </div>
            </div>
        </div>
    );
}

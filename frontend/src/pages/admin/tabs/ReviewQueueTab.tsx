export function ReviewQueueTab(props: any) {
    const {
        formatLastUpdated,
        listUpdatedAt,
        refreshData,
        listLoading,
        enableAdminReviewV3,
        canApproveAnnouncements,
        pendingSlaStats,
        pendingAnnouncements,
        selectedIds,
        selectedReviewTemplate,
        handleReviewTemplateSelect,
        reviewNoteTemplates,
        reviewBulkNote,
        setReviewBulkNote,
        reviewScheduleAt,
        setReviewScheduleAt,
        reviewLoading,
        handleBulkApprove,
        handleBulkReject,
        canWriteAnnouncements,
        handleBulkSchedule,
        handleBulkQaFix,
        qaBulkLoading,
        selectedQaFixableCount,
        handleBulkQaFlag,
        selectedQaIssueCount,
        clearSelection,
        getAnnouncementWarnings,
        getReviewRisk,
        reviewNotes,
        mutatingIds,
        setReviewNotes,
        handleView,
        handleEdit,
        handleQaFix,
        handleQaFlag,
        handleApprove,
        handleReject,
        toggleSelectAll,
        toggleSelection,
        renderDateCell,
    } = props;

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Pending review queue</h3>
                    <p className="admin-subtitle">Approve, reject, or schedule announcements awaiting review.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(listUpdatedAt)}</span>
                    <button className="admin-btn secondary" onClick={refreshData} disabled={listLoading}>
                        {listLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>
            {enableAdminReviewV3 && !canApproveAnnouncements && (
                <div className="admin-banner warning" role="status">
                    Read-only role: review decisions are disabled for your account.
                </div>
            )}

            <div className={`admin-review-panel ${enableAdminReviewV3 ? 'sticky' : ''}`}>
                <div className="admin-review-meta">
                    <span>{pendingSlaStats.pendingTotal} pending</span>
                    <span>Showing {pendingAnnouncements.length} of {pendingSlaStats.pendingTotal}</span>
                    <span>{selectedIds.size} selected</span>
                </div>
                <div className="admin-review-controls">
                    {enableAdminReviewV3 && (
                        <select
                            className="admin-select"
                            value={selectedReviewTemplate}
                            onChange={(e) => handleReviewTemplateSelect(e.target.value)}
                            aria-label="Review note templates"
                        >
                            <option value="">Decision templates</option>
                            {reviewNoteTemplates.map((template: any) => (
                                <option key={template.id} value={template.id}>{template.label}</option>
                            ))}
                        </select>
                    )}
                    <input
                        className="review-note-input"
                        aria-label="Review note"
                        type="text"
                        value={reviewBulkNote}
                        onChange={(e) => setReviewBulkNote(e.target.value)}
                        placeholder="Review note for bulk actions"
                        disabled={reviewLoading}
                    />
                    <input
                        type="datetime-local"
                        value={reviewScheduleAt}
                        onChange={(e) => setReviewScheduleAt(e.target.value)}
                        disabled={reviewLoading}
                    />
                    {canApproveAnnouncements && (
                        <button className="admin-btn success" onClick={() => handleBulkApprove()} disabled={reviewLoading}>
                            {reviewLoading ? 'Working...' : 'Approve selected'}
                        </button>
                    )}
                    {canApproveAnnouncements && (
                        <button className="admin-btn warning" onClick={() => handleBulkReject()} disabled={reviewLoading}>
                            Reject selected
                        </button>
                    )}
                    {canWriteAnnouncements && (
                        <button className="admin-btn primary" onClick={() => handleBulkSchedule()} disabled={reviewLoading}>
                            Schedule selected
                        </button>
                    )}
                    {canWriteAnnouncements && (
                        <button
                            className="admin-btn info"
                            onClick={handleBulkQaFix}
                            disabled={reviewLoading || qaBulkLoading || selectedQaFixableCount === 0}
                        >
                            {qaBulkLoading ? 'Working...' : `QA auto-fix (${selectedQaFixableCount})`}
                        </button>
                    )}
                    {canWriteAnnouncements && (
                        <button
                            className="admin-btn warning"
                            onClick={handleBulkQaFlag}
                            disabled={reviewLoading || qaBulkLoading || selectedQaIssueCount === 0}
                        >
                            Flag QA ({selectedQaIssueCount})
                        </button>
                    )}
                    <button className="admin-btn secondary" onClick={clearSelection} disabled={reviewLoading}>
                        Clear selection
                    </button>
                </div>
            </div>

            <div className="admin-section-panel">
                <div className="admin-list-header">
                    <div>
                        <h4>SLA view</h4>
                        <p className="admin-subtitle">Ageing pending items and stale backlog (7+ days).</p>
                    </div>
                    <div className="admin-list-actions">
                        <span className="admin-updated">Average age: {pendingSlaStats.averageDays}d</span>
                    </div>
                </div>
                <div className="admin-user-grid">
                    <div className="user-card">
                        <div className="card-label">&lt; 1 day</div>
                        <div className="card-value">{pendingSlaStats.buckets.lt1}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">1 - 3 days</div>
                        <div className="card-value">{pendingSlaStats.buckets.d1_3}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">3 - 7 days</div>
                        <div className="card-value">{pendingSlaStats.buckets.d3_7}</div>
                    </div>
                    <div className="user-card">
                        <div className="card-label">Stale &gt; 7d</div>
                        <div className="card-value accent">{pendingSlaStats.buckets.gt7}</div>
                    </div>
                </div>
            </div>

            {pendingSlaStats.stale.length > 0 && (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Stale pending</th>
                                <th>Age</th>
                                <th>QA</th>
                                {enableAdminReviewV3 && <th>Risk</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingSlaStats.stale.map(({ item, ageDays }: any) => {
                                const warnings = getAnnouncementWarnings(item);
                                const risk = getReviewRisk(item);
                                const reviewNote = reviewNotes[item.id] ?? '';
                                const isRowMutating = mutatingIds.has(item.id);
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="title-cell">
                                                <div className="title-text" title={item.title}>{item.title}</div>
                                                <div className="title-meta">
                                                    <span title={item.organization || 'Unknown'}>{item.organization || 'Unknown'}</span>
                                                    <span className="meta-sep">|</span>
                                                    <span>{item.category || 'Uncategorized'}</span>
                                                    <span className="meta-sep">|</span>
                                                    <span>v{(item as any).version ?? 1}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{ageDays}d</td>
                                        <td>
                                            {warnings.length > 0 ? (
                                                <span className="qa-warning" title={warnings.join(' • ')}>
                                                    {warnings.length} issue{warnings.length > 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="status-sub success">Clear</span>
                                            )}
                                        </td>
                                        {enableAdminReviewV3 && (
                                            <td>
                                                <span className={`status-pill ${risk.severity === 'high' ? 'warning' : risk.severity === 'medium' ? 'info' : 'success'}`}>
                                                    {risk.severity} ({risk.score})
                                                </span>
                                            </td>
                                        )}
                                        <td>
                                            <div className="table-actions">
                                                <input
                                                    className="review-note-input"
                                                    aria-label="Review note"
                                                    type="text"
                                                    value={reviewNote}
                                                    onChange={(e) => setReviewNotes((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
                                                    placeholder="Review note (optional)"
                                                    disabled={isRowMutating}
                                                />
                                                <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                {canWriteAnnouncements && (
                                                    <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                )}
                                                {canWriteAnnouncements && warnings.length > 0 && (
                                                    <>
                                                        <button
                                                            className="admin-btn info small"
                                                            onClick={() => handleQaFix(item)}
                                                            disabled={isRowMutating}
                                                            title="Apply automated QA fixes for this row"
                                                        >
                                                            Auto-fix
                                                        </button>
                                                        <button
                                                            className="admin-btn warning small"
                                                            onClick={() => handleQaFlag(item)}
                                                            disabled={isRowMutating}
                                                            title="Flag this listing for QA review"
                                                        >
                                                            Flag
                                                        </button>
                                                    </>
                                                )}
                                                {canApproveAnnouncements && (
                                                    <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                )}
                                                {canApproveAnnouncements && (
                                                    <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {pendingAnnouncements.length === 0 ? (
                <div className="empty-state">No announcements pending review.</div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        aria-label="Select all pending"
                                        checked={pendingAnnouncements.length > 0 && pendingAnnouncements.every((item: any) => selectedIds.has(item.id))}
                                        onChange={(e) => toggleSelectAll(e.target.checked, pendingAnnouncements.map((item: any) => item.id))}
                                    />
                                </th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Deadline</th>
                                <th>QA</th>
                                {enableAdminReviewV3 && <th>Risk</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingAnnouncements.map((item: any) => {
                                const qaWarnings = getAnnouncementWarnings(item);
                                const risk = getReviewRisk(item);
                                const reviewNote = reviewNotes[item.id] ?? '';
                                const isRowMutating = mutatingIds.has(item.id);
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                disabled={isRowMutating}
                                            />
                                        </td>
                                        <td>
                                            <div className="title-cell">
                                                <div className="title-text" title={item.title}>{item.title}</div>
                                                <div className="title-meta">
                                                    <span title={item.organization || 'Unknown'}>{item.organization || 'Unknown'}</span>
                                                    <span className="meta-sep">|</span>
                                                    <span>{item.category || 'Uncategorized'}</span>
                                                    <span className="meta-sep">|</span>
                                                    <span>v{(item as any).version ?? 1}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                        <td>{renderDateCell(item.deadline ?? undefined)}</td>
                                        <td>
                                            {qaWarnings.length > 0 ? (
                                                <span className="qa-warning" title={qaWarnings.join(' • ')}>
                                                    {qaWarnings.length} issue{qaWarnings.length > 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="status-sub success">Looks good</span>
                                            )}
                                        </td>
                                        {enableAdminReviewV3 && (
                                            <td>
                                                <span className={`status-pill ${risk.severity === 'high' ? 'warning' : risk.severity === 'medium' ? 'info' : 'success'}`}>
                                                    {risk.severity} ({risk.score})
                                                </span>
                                            </td>
                                        )}
                                        <td>
                                            <div className="table-actions">
                                                <input
                                                    className="review-note-input"
                                                    aria-label="Review note"
                                                    type="text"
                                                    value={reviewNote}
                                                    onChange={(e) => setReviewNotes((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
                                                    placeholder="Review note (optional)"
                                                    disabled={isRowMutating}
                                                />
                                                <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                {canWriteAnnouncements && (
                                                    <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                )}
                                                {canApproveAnnouncements && (
                                                    <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                )}
                                                {canApproveAnnouncements && (
                                                    <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

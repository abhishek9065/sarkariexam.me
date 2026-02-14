import { Announcement, AnnouncementStatus, ContentType } from '../../types';
import { CopyButton } from './CopyButton';
import { formatNumber } from '../../utils/formatters';
import { ActionOverflowMenu } from './ActionOverflowMenu';
import { TableToolbar } from './TableToolbar';

interface AdminContentListProps {
    items: Announcement[];
    loading: boolean;
    total: number;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;

    // Filters
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: ContentType | 'all';
    onTypeFilterChange: (type: ContentType | 'all') => void;
    statusFilter: AnnouncementStatus | 'all';
    onStatusFilterChange: (status: AnnouncementStatus | 'all') => void;
    sortOption: 'newest' | 'updated' | 'deadline' | 'views';
    onSortChange: (sort: 'newest' | 'updated' | 'deadline' | 'views') => void;

    // Actions
    onRefresh: () => void;
    onEdit: (item: Announcement) => void;
    onDelete: (id: string, name: string) => void;
    onView: (item: Announcement) => void;
    onDuplicate: (item: Announcement) => void;
    onExport: () => void;
    onCreate?: () => void;
    onTogglePublish?: (item: Announcement) => void;
    onBoost?: (item: Announcement) => void;

    // Selection
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onBulkAction: (action: string) => void;

    lastUpdated: string | null;
    formatDateTime: (value?: string | null) => string;
    timeZoneLabel: string;
    filterSummary?: string;
    onClearFilters?: () => void;
    canWrite?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    enableCompactActions?: boolean;
}

export function AdminContentList({
    items,
    loading,
    total,
    page,
    totalPages,
    onPageChange,
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    sortOption,
    onSortChange,
    onRefresh,
    onEdit,
    onDelete,
    onView,
    onDuplicate,
    onExport,
    onCreate,
    onTogglePublish,
    onBoost,
    selectedIds,
    onSelectionChange,
    onBulkAction,
    lastUpdated,
    formatDateTime,
    timeZoneLabel,
    filterSummary,
    onClearFilters,
    canWrite = true,
    canDelete = true,
    canApprove = true,
    enableCompactActions = true,
}: AdminContentListProps) {

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            onSelectionChange(new Set());
            return;
        }
        onSelectionChange(new Set(items.map(i => i.id)));
    };

    const getAvailabilityStatus = (item: Announcement) => {
        if (item.deadline) {
            const deadlineTime = new Date(item.deadline).getTime();
            if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
                return { label: 'Expired', tone: 'danger' };
            }
        }
        if (item.isActive === false) {
            return { label: 'Inactive', tone: 'muted' };
        }
        return { label: 'Active', tone: 'success' };
    };

    const getWorkflowStatus = (item: Announcement) => {
        const status = item.status ?? 'published';
        switch (status) {
            case 'draft': return { label: 'Draft', tone: 'muted' };
            case 'pending': return { label: 'Pending', tone: 'warning' };
            case 'scheduled': return { label: 'Scheduled', tone: 'info' };
            case 'archived': return { label: 'Archived', tone: 'muted' };
            case 'published':
            default: return { label: 'Published', tone: 'success' };
        }
    };

    const renderSortButton = (label: string, sortKey: 'newest' | 'updated' | 'deadline' | 'views') => {
        const isActive = sortOption === sortKey;
        return (
            <button
                type="button"
                className={`table-sort ${isActive ? 'active' : ''}`}
                onClick={() => onSortChange(sortKey)}
                aria-label={`Sort by ${label}`}
            >
                <span>{label}</span>
                <span className="sort-indicator">{isActive ? '▲' : '⇅'}</span>
            </button>
        );
    };

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const formatted = formatDateTime(value);
        return formatted === '-' ? 'Not updated yet' : formatted;
    };

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Content manager</h3>
                    <p className="admin-subtitle">Manage all job postings, results, and other announcements.</p>
                    <span className="admin-timezone-note">Times shown in {timeZoneLabel}</span>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">Updated {formatLastUpdated(lastUpdated)}</span>
                    <button type="button" className="admin-btn secondary" onClick={onRefresh} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button type="button" className="admin-btn secondary" onClick={onExport}>
                        {enableCompactActions ? 'Download CSV' : 'Export CSV'}
                    </button>
                    {canWrite && (
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => (onCreate ? onCreate() : onEdit({} as any))}
                        >
                            {enableCompactActions ? 'New announcement' : 'New job'}
                        </button>
                    )}
                </div>
            </div>

            {enableCompactActions ? (
                <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                    typeFilter={typeFilter}
                    onTypeFilterChange={onTypeFilterChange}
                    statusFilter={statusFilter}
                    onStatusFilterChange={onStatusFilterChange}
                    sortOption={sortOption}
                    onSortChange={onSortChange}
                    filterSummary={filterSummary}
                    onClearFilters={onClearFilters}
                />
            ) : (
                <div className="admin-filters">
                    <div className="filter-group main">
                        <input
                            id="admin-list-search"
                            type="text"
                            placeholder="Search by title, organization..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            aria-label="Search announcements"
                            className="admin-search"
                        />
                    </div>
                    <div className="filter-group">
                        <select
                            value={typeFilter}
                            onChange={(e) => onTypeFilterChange(e.target.value as ContentType | 'all')}
                            aria-label="Filter by announcement type"
                            className="admin-select"
                        >
                            <option value="all">All Types</option>
                            <option value="job">Latest Jobs</option>
                            <option value="admit-card">Admit Cards</option>
                            <option value="result">Latest Results</option>
                            <option value="answer-key">Answer Keys</option>
                            <option value="syllabus">Syllabus</option>
                            <option value="admission">Admission</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value as AnnouncementStatus | 'all')}
                            aria-label="Filter by status"
                            className="admin-select"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending Review</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select
                            value={sortOption}
                            onChange={(e) => onSortChange(e.target.value as 'newest' | 'updated' | 'deadline' | 'views')}
                            aria-label="Sort announcements"
                            className="admin-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="updated">Recently Updated</option>
                            <option value="deadline">Deadline Soonest</option>
                            <option value="views">Most Viewed</option>
                        </select>
                    </div>
                    {filterSummary && (
                        <div className="filter-summary" role="status" aria-live="polite">
                            <span>{filterSummary}</span>
                            {onClearFilters && (
                                <button type="button" className="filter-clear" onClick={onClearFilters}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedIds.size > 0 && (
                <div className="admin-bulk-actions">
                    <div className="bulk-info">
                        <span className="bulk-count">{selectedIds.size} selected</span>
                        <button
                            type="button"
                            className="bulk-clear"
                            onClick={() => onSelectionChange(new Set())}
                        >
                            Clear selection
                        </button>
                    </div>
                    <div className="bulk-buttons">
                        {canApprove && <button type="button" className="admin-btn success small" onClick={() => onBulkAction('approve')}>Approve</button>}
                        {canApprove && <button type="button" className="admin-btn warning small" onClick={() => onBulkAction('reject')}>Reject</button>}
                        {canWrite && <button type="button" className="admin-btn secondary small" onClick={() => onBulkAction('archive')}>Archive</button>}
                        {canDelete && <button type="button" className="admin-btn danger small" onClick={() => onBulkAction('delete')}>Delete</button>}
                    </div>
                </div>
            )}

            {items.length === 0 && !loading ? (
                <div className="empty-state">
                    <div>No announcements found matching your filters.</div>
                    {filterSummary && onClearFilters && (
                        <button type="button" className="admin-btn secondary small" onClick={onClearFilters}>
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th className="th-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={items.length > 0 && selectedIds.size === items.length}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        aria-label="Select all announcements"
                                    />
                                </th>
                                <th aria-sort={sortOption === 'newest' ? 'descending' : 'none'}>
                                    {renderSortButton('Title / Organization', 'newest')}
                                </th>
                                <th>Type</th>
                                <th>Status</th>
                                <th aria-sort={sortOption === 'updated' ? 'descending' : 'none'}>
                                    {renderSortButton('Updated', 'updated')}
                                </th>
                                <th aria-sort={sortOption === 'views' ? 'descending' : 'none'}>
                                    {renderSortButton('Views', 'views')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                if (!item) return null;
                                const availability = getAvailabilityStatus(item);
                                const workflow = getWorkflowStatus(item);
                                const overflowActions = [
                                    ...(canWrite
                                        ? [
                                            { id: 'edit', label: 'Edit', onClick: () => onEdit(item) },
                                            { id: 'duplicate', label: 'Duplicate', onClick: () => onDuplicate(item) },
                                        ]
                                        : []),
                                    ...(canWrite && onTogglePublish
                                        ? [{
                                            id: 'publish_toggle',
                                            label: item.status === 'published' ? 'Unpublish' : 'Publish',
                                            onClick: () => onTogglePublish(item),
                                            tone: item.status === 'published' ? 'warning' as const : 'info' as const,
                                        }]
                                        : []),
                                    ...(canWrite && onBoost
                                        ? [{ id: 'boost', label: 'Boost', onClick: () => onBoost(item), tone: 'info' as const }]
                                        : []),
                                    ...(canDelete
                                        ? [{
                                            id: 'delete',
                                            label: 'Delete',
                                            onClick: () => onDelete(item.id, item.title),
                                            tone: 'danger' as const,
                                        }]
                                        : []),
                                ];

                                return (
                                    <tr key={item.id} className={selectedIds.has(item.id) ? 'selected' : ''}>
                                        <td className="td-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                aria-label={`Select ${item.title}`}
                                            />
                                        </td>
                                        <td>
                                            <div className="row-title">
                                                <span className="title-text" title={item.title}>{item.title}</span>
                                                <div className="title-meta">
                                                    <span className="org-text">{item.organization}</span>
                                                    <CopyButton text={item.id} label="ID" />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`type-badge ${item.type || 'unknown'}`}>
                                                {item.type ? item.type.replace('-', ' ') : 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="status-cell">
                                                <span className={`status-badge ${workflow.tone}`}>
                                                    {workflow.label}
                                                </span>
                                                {availability.label !== 'Active' && (
                                                    <span className={`status-dot ${availability.tone}`} title={availability.label} />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="cell-muted">{formatDateTime(item.updatedAt || item.postedAt)}</span>
                                        </td>
                                        <td>{formatNumber(item.viewCount)}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button
                                                    type="button"
                                                    className="admin-btn secondary small"
                                                    aria-label="View announcement"
                                                    onClick={() => onView(item)}
                                                >
                                                    View
                                                </button>
                                                {enableCompactActions && overflowActions.length > 0 ? (
                                                    <ActionOverflowMenu
                                                        itemLabel={item.title}
                                                        actions={overflowActions}
                                                    />
                                                ) : !enableCompactActions ? (
                                                    <>
                                                        {canWrite && (
                                                            <button type="button" className="action-btn" title="Edit" data-tooltip="Edit" aria-label="Edit announcement" onClick={() => onEdit(item)}>
                                                                ✎
                                                            </button>
                                                        )}
                                                        {canWrite && (
                                                            <button type="button" className="action-btn" title="Duplicate" data-tooltip="Duplicate" aria-label="Duplicate announcement" onClick={() => onDuplicate(item)}>
                                                                📋
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button type="button" className="action-btn danger" title="Delete" data-tooltip="Delete" aria-label="Delete announcement" onClick={() => onDelete(item.id, item.title)}>
                                                                🗑
                                                            </button>
                                                        )}
                                                    </>
                                                ) : null}
                                                {!canWrite && !canDelete && (
                                                    <span className="cell-muted">Read-only</span>
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

            <div className="pagination">
                <span className="page-info">
                    Page {page} of {totalPages} ({total} items)
                </span>
                <div className="page-controls">
                    <button
                        type="button"
                        className="page-btn"
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="page-btn"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}


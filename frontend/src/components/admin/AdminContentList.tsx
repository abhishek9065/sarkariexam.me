import { useMemo } from 'react';
import { Announcement, AnnouncementStatus, ContentType } from '../../types';
import { CONTENT_TYPES, STATUS_OPTIONS } from './constants';
import { CopyButton } from './CopyButton';
import { formatDateTime } from '../../utils/formatters';

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

    // Selection
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onBulkAction: (action: string) => void;

    lastUpdated: string | null;
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
    selectedIds,
    onSelectionChange,
    onBulkAction,
    lastUpdated
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

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Content manager</h3>
                    <p className="admin-subtitle">Manage all job postings, results, and other announcements.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">Updated {formatLastUpdated(lastUpdated)}</span>
                    <button className="admin-btn secondary" onClick={onRefresh} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button className="admin-btn secondary" onClick={onExport}>
                        Export CSV
                    </button>
                    <button className="admin-btn primary" onClick={() => onEdit({} as any)}>New job</button>
                    {/* Note: New Job button here might be better handled by parent calling setActiveTab('add') */}
                </div>
            </div>

            <div className="admin-filters">
                <div className="filter-group main">
                    <input
                        type="text"
                        placeholder="Search by title, organization..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="admin-search"
                    />
                </div>
                <div className="filter-group">
                    <select
                        value={typeFilter}
                        onChange={(e) => onTypeFilterChange(e.target.value as ContentType | 'all')}
                        className="admin-select"
                    >
                        <option value="all">All Types</option>
                        {CONTENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value as AnnouncementStatus | 'all')}
                        className="admin-select"
                    >
                        <option value="all">All Status</option>
                        {STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                    <select
                        value={sortOption}
                        onChange={(e) => onSortChange(e.target.value as any)}
                        className="admin-select"
                    >
                        <option value="newest">Newest First</option>
                        <option value="updated">Recently Updated</option>
                        <option value="deadline">Deadline Soonest</option>
                        <option value="views">Most Viewed</option>
                    </select>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="admin-bulk-actions">
                    <span className="bulk-count">{selectedIds.size} selected</span>
                    <div className="bulk-buttons">
                        <button className="admin-btn success small" onClick={() => onBulkAction('approve')}>Approve</button>
                        <button className="admin-btn warning small" onClick={() => onBulkAction('reject')}>Reject</button>
                        <button className="admin-btn secondary small" onClick={() => onBulkAction('archive')}>Archive</button>
                        <button className="admin-btn danger small" onClick={() => onBulkAction('delete')}>Delete</button>
                    </div>
                </div>
            )}

            {items.length === 0 && !loading ? (
                <div className="empty-state">
                    No announcements found matching your filters.
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
                                    />
                                </th>
                                <th>Title / Organization</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Views</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const availability = getAvailabilityStatus(item);
                                const workflow = getWorkflowStatus(item);

                                return (
                                    <tr key={item.id} className={selectedIds.has(item.id) ? 'selected' : ''}>
                                        <td className="td-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
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
                                        <td>{item.views.toLocaleString()}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="action-btn" title="View" onClick={() => onView(item)}>
                                                    👁
                                                </button>
                                                <button className="action-btn" title="Edit" onClick={() => onEdit(item)}>
                                                    ✎
                                                </button>
                                                <button className="action-btn" title="Duplicate" onClick={() => onDuplicate(item)}>
                                                    📋
                                                </button>
                                                <button className="action-btn danger" title="Delete" onClick={() => onDelete(item.id, item.title)}>
                                                    🗑
                                                </button>
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
                        className="page-btn"
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        Previous
                    </button>
                    <button
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

// Simple formatter if not imported
function formatDateTime(value?: string | null) {
    if (!value) return '-';
    // ... logic or just assume it's moved to utils later
    return new Date(value).toLocaleDateString();
}

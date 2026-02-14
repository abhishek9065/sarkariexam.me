import type { AnnouncementStatus, ContentType } from '../../types';
import { CONTENT_TYPES, STATUS_OPTIONS } from './constants';

interface TableToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: ContentType | 'all';
    onTypeFilterChange: (value: ContentType | 'all') => void;
    statusFilter: AnnouncementStatus | 'all';
    onStatusFilterChange: (value: AnnouncementStatus | 'all') => void;
    sortOption: 'newest' | 'updated' | 'deadline' | 'views';
    onSortChange: (value: 'newest' | 'updated' | 'deadline' | 'views') => void;
    filterSummary?: string;
    onClearFilters?: () => void;
}

export function TableToolbar({
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    sortOption,
    onSortChange,
    filterSummary,
    onClearFilters,
}: TableToolbarProps) {
    return (
        <div className="admin-filters admin-table-toolbar">
            <div className="filter-group main">
                <input
                    id="admin-list-search"
                    type="search"
                    placeholder="Search by title, organization, or ID..."
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    aria-label="Search announcements"
                    className="admin-search"
                />
            </div>
            <div className="filter-group">
                <select
                    value={typeFilter}
                    onChange={(event) => onTypeFilterChange(event.target.value as ContentType | 'all')}
                    aria-label="Filter by announcement type"
                    className="admin-select"
                >
                    <option value="all">All types</option>
                    {CONTENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(event) => onStatusFilterChange(event.target.value as AnnouncementStatus | 'all')}
                    aria-label="Filter by status"
                    className="admin-select"
                >
                    <option value="all">All status</option>
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                </select>
                <select
                    value={sortOption}
                    onChange={(event) => onSortChange(event.target.value as 'newest' | 'updated' | 'deadline' | 'views')}
                    aria-label="Sort announcements"
                    className="admin-select"
                >
                    <option value="newest">Newest first</option>
                    <option value="updated">Recently updated</option>
                    <option value="deadline">Deadline soonest</option>
                    <option value="views">Most viewed</option>
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
    );
}


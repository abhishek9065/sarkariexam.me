import type { AnnouncementStatus, ContentType } from '../../types';
import { CONTENT_TYPES, STATUS_OPTIONS } from './constants';

interface TableToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: ContentType | 'all';
    onTypeFilterChange: (value: ContentType | 'all') => void;
    statusFilter: AnnouncementStatus | 'all';
    onStatusFilterChange: (value: AnnouncementStatus | 'all') => void;
    sortOption: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
    onSortChange: (value: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views') => void;
    filterSummary?: string;
    onClearFilters?: () => void;
    quickChips?: Array<{
        id: string;
        label: string;
        active?: boolean;
        onClick: () => void;
    }>;
    presets?: Array<{ id: string; label: string }>;
    selectedPresetId?: string;
    onSelectPreset?: (presetId: string) => void;
    onSavePreset?: () => void;
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
    quickChips = [],
    presets = [],
    selectedPresetId = '',
    onSelectPreset,
    onSavePreset,
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
                    onChange={(event) => onSortChange(event.target.value as 'newest' | 'oldest' | 'updated' | 'deadline' | 'views')}
                    aria-label="Sort announcements"
                    className="admin-select"
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="updated">Recently updated</option>
                    <option value="deadline">Deadline soonest</option>
                    <option value="views">Most viewed</option>
                </select>
            </div>
            {quickChips.length > 0 && (
                <div className="admin-quick-chip-row" aria-label="Quick list modes">
                    {quickChips.map((chip) => (
                        <button
                            key={chip.id}
                            type="button"
                            className={`quick-chip ${chip.active ? 'active' : ''}`}
                            onClick={chip.onClick}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            )}
            {(presets.length > 0 || onSavePreset) && (
                <div className="admin-preset-row">
                    <label className="sr-only" htmlFor="admin-preset-select">Saved filter preset</label>
                    <select
                        id="admin-preset-select"
                        className="admin-select"
                        value={selectedPresetId}
                        onChange={(event) => onSelectPreset?.(event.target.value)}
                    >
                        <option value="">Saved presets</option>
                        {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                        ))}
                    </select>
                    {onSavePreset && (
                        <button type="button" className="admin-btn secondary small" onClick={onSavePreset}>
                            Save current filters
                        </button>
                    )}
                </div>
            )}
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

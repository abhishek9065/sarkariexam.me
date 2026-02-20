import type { AdminAnnouncementFilterPreset, AnnouncementSortOption, AnnouncementStatusFilter, AnnouncementTypeFilter } from '../../../types';

const CONTENT_TYPES: { value: AnnouncementTypeFilter; label: string }[] = [
    { value: 'job', label: 'Latest Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Latest Results' },
    { value: 'answer-key', label: 'Answer Keys' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'admission', label: 'Admission' },
];

const STATUS_OPTIONS: { value: AnnouncementStatusFilter; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

interface TableToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: AnnouncementTypeFilter | 'all';
    onTypeFilterChange: (value: AnnouncementTypeFilter | 'all') => void;
    statusFilter: AnnouncementStatusFilter | 'all';
    onStatusFilterChange: (value: AnnouncementStatusFilter | 'all') => void;
    sortOption: AnnouncementSortOption;
    onSortChange: (value: AnnouncementSortOption) => void;
    dateStart?: string;
    onDateStartChange?: (value: string) => void;
    dateEnd?: string;
    onDateEndChange?: (value: string) => void;
    authorFilter?: string;
    onAuthorFilterChange?: (value: string) => void;
    filterSummary?: string;
    onClearFilters?: () => void;
    quickChips?: Array<{
        id: string;
        label: string;
        active?: boolean;
        onClick: () => void;
    }>;
    presets?: Array<AdminAnnouncementFilterPreset>;
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
    dateStart,
    onDateStartChange,
    dateEnd,
    onDateEndChange,
    authorFilter,
    onAuthorFilterChange,
    filterSummary,
    onClearFilters,
    quickChips = [],
    presets = [],
    selectedPresetId = '',
    onSelectPreset,
    onSavePreset,
}: TableToolbarProps) {
    return (
        <div className="ops-toolbar">
            <div className="ops-toolbar-grid">
                <input
                    type="search"
                    placeholder="Search by title, organization, or ID"
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    aria-label="Search announcements"
                />
                <select
                    value={typeFilter}
                    onChange={(event) => onTypeFilterChange(event.target.value as AnnouncementTypeFilter | 'all')}
                    aria-label="Filter by announcement type"
                >
                    <option value="all">All types</option>
                    {CONTENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(event) => onStatusFilterChange(event.target.value as AnnouncementStatusFilter | 'all')}
                    aria-label="Filter by status"
                >
                    <option value="all">All status</option>
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                </select>
            </div>

            <div className="ops-toolbar-grid two">
                <select
                    value={sortOption}
                    onChange={(event) => onSortChange(event.target.value as AnnouncementSortOption)}
                    aria-label="Sort announcements"
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="updated">Recently updated</option>
                    <option value="deadline">Deadline soonest</option>
                    <option value="views">Most viewed</option>
                </select>
                {(presets.length > 0 || onSavePreset) ? (
                    <div className="ops-actions">
                        <label className="ops-visually-hidden" htmlFor="admin-preset-select">Saved filter preset</label>
                        <select
                            id="admin-preset-select"
                            value={selectedPresetId}
                            onChange={(event) => onSelectPreset?.(event.target.value)}
                        >
                            <option value="">Saved presets</option>
                            {presets.map((preset) => (
                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                            ))}
                        </select>
                        {onSavePreset ? (
                            <button type="button" className="admin-btn small" onClick={onSavePreset}>
                                Save current filters
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {onDateStartChange && onDateEndChange && onAuthorFilterChange ? (
                <div className="ops-toolbar-grid three">
                    <input
                        type="date"
                        value={dateStart || ''}
                        onChange={(event) => onDateStartChange(event.target.value)}
                        aria-label="Filter by Start Date"
                        title="Start Date"
                    />
                    <input
                        type="date"
                        value={dateEnd || ''}
                        onChange={(event) => onDateEndChange(event.target.value)}
                        aria-label="Filter by End Date"
                        title="End Date"
                    />
                    <input
                        type="text"
                        placeholder="Created by (Username or ID)"
                        value={authorFilter || ''}
                        onChange={(event) => onAuthorFilterChange(event.target.value)}
                        aria-label="Filter by author"
                    />
                </div>
            ) : null}

            {quickChips.length > 0 ? (
                <div className="ops-actions" aria-label="Quick list modes">
                    {quickChips.map((chip) => (
                        <button
                            key={chip.id}
                            type="button"
                            className={`admin-btn small ${chip.active ? 'primary' : 'subtle'}`}
                            onClick={chip.onClick}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {filterSummary ? (
                <div className="ops-actions">
                    <span className="ops-inline-muted">{filterSummary}</span>
                    {onClearFilters ? (
                        <button type="button" className="admin-btn small" onClick={onClearFilters}>
                            Clear filters
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

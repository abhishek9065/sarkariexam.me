import type {
    AdminAnnouncementFilterPreset,
    AnnouncementSortOption,
    AnnouncementStatusFilter,
    AnnouncementTypeFilter,
} from '../../types';
import { FilterRail } from '../../components/workspace';

const CONTENT_TYPES: { value: AnnouncementTypeFilter; label: string }[] = [
    { value: 'job', label: 'Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Results' },
    { value: 'answer-key', label: 'Answer Keys' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'admission', label: 'Admissions' },
];

const STATUS_OPTIONS: { value: AnnouncementStatusFilter; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

type ManagePostsFilterRailProps = {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: AnnouncementTypeFilter | 'all';
    onTypeFilterChange: (value: AnnouncementTypeFilter | 'all') => void;
    statusFilter: AnnouncementStatusFilter | 'all';
    onStatusFilterChange: (value: AnnouncementStatusFilter | 'all') => void;
    sortOption: AnnouncementSortOption;
    onSortChange: (value: AnnouncementSortOption) => void;
    dateStart?: string;
    onDateStartChange: (value: string) => void;
    dateEnd?: string;
    onDateEndChange: (value: string) => void;
    authorFilter?: string;
    onAuthorFilterChange: (value: string) => void;
    filterSummary: string;
    onClearFilters: () => void;
    quickChips: Array<{
        id: string;
        label: string;
        active?: boolean;
        onClick: () => void;
    }>;
    presets: Array<AdminAnnouncementFilterPreset>;
    selectedPresetId?: string;
    onSelectPreset: (presetId: string) => void;
    onSavePreset?: () => void;
};

export function ManagePostsFilterRail({
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
    quickChips,
    presets,
    selectedPresetId = '',
    onSelectPreset,
    onSavePreset,
}: ManagePostsFilterRailProps) {
    return (
        <FilterRail
            controls={(
                <>
                    <input
                        type="search"
                        placeholder="Search title, organization, or announcement ID"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        aria-label="Search announcements"
                    />
                    <select
                        value={typeFilter}
                        onChange={(event) => onTypeFilterChange(event.target.value as AnnouncementTypeFilter | 'all')}
                        aria-label="Filter by announcement type"
                    >
                        <option value="all">All content types</option>
                        {CONTENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value as AnnouncementStatusFilter | 'all')}
                        aria-label="Filter by status"
                    >
                        <option value="all">All statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
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
                    <input
                        type="date"
                        value={dateStart || ''}
                        onChange={(event) => onDateStartChange(event.target.value)}
                        aria-label="Updated after"
                    />
                    <input
                        type="date"
                        value={dateEnd || ''}
                        onChange={(event) => onDateEndChange(event.target.value)}
                        aria-label="Updated before"
                    />
                    <input
                        type="text"
                        placeholder="Posted by (user ID or email)"
                        value={authorFilter || ''}
                        onChange={(event) => onAuthorFilterChange(event.target.value)}
                        aria-label="Filter by post author"
                    />
                    <div className="workspace-header-actions">
                        <select
                            value={selectedPresetId}
                            onChange={(event) => onSelectPreset(event.target.value)}
                            aria-label="Saved filter preset"
                        >
                            <option value="">Saved views</option>
                            {presets.map((preset) => (
                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                            ))}
                        </select>
                        {onSavePreset ? (
                            <button type="button" className="admin-btn subtle" onClick={onSavePreset}>
                                Save view
                            </button>
                        ) : null}
                    </div>
                </>
            )}
            actions={(
                <>
                    <div className="workspace-header-actions">
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
                    <div className="workspace-header-actions">
                        <span className="ops-inline-muted">{filterSummary}</span>
                        <button type="button" className="admin-btn small" onClick={onClearFilters}>
                            Clear filters
                        </button>
                    </div>
                </>
            )}
        />
    );
}

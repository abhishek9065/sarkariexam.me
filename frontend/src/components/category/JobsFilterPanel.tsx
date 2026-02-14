import type { ChangeEvent } from 'react';

export interface JobsFilterState {
    search: string;
    state: string;
    qualification: string;
    organization: string;
}

export interface FilterOptionSets {
    states: string[];
    qualifications: string[];
    organizations: string[];
}

interface Props {
    value: JobsFilterState;
    options: FilterOptionSets;
    sort: 'newest' | 'oldest' | 'deadline' | 'views';
    viewMode: 'compact' | 'card';
    onChange: (next: JobsFilterState) => void;
    onSortChange: (value: 'newest' | 'oldest' | 'deadline' | 'views') => void;
    onViewModeChange: (value: 'compact' | 'card') => void;
    onApply: () => void;
    onReset: () => void;
}

const SORT_OPTIONS: Array<{ value: 'newest' | 'oldest' | 'deadline' | 'views'; label: string }> = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'views', label: 'Most Viewed' },
];

export function JobsFilterPanel({
    value,
    options,
    sort,
    viewMode,
    onChange,
    onSortChange,
    onViewModeChange,
    onApply,
    onReset,
}: Props) {
    const handleInput = (key: keyof JobsFilterState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onChange({ ...value, [key]: event.target.value });
    };

    return (
        <section className="jobs-filter-panel card" data-testid="jobs-filter-panel">
            <div className="jobs-filter-grid">
                <label className="jobs-filter-field">
                    <span>Search</span>
                    <input
                        className="input"
                        type="text"
                        aria-label="Search"
                        value={value.search}
                        onChange={handleInput('search')}
                        placeholder="Search jobs..."
                    />
                </label>

                <label className="jobs-filter-field">
                    <span>State</span>
                    <select className="input" aria-label="State" value={value.state} onChange={handleInput('state')}>
                        <option value="">All States</option>
                        {options.states.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </label>

                <label className="jobs-filter-field">
                    <span>Qualification</span>
                    <select className="input" aria-label="Qualification" value={value.qualification} onChange={handleInput('qualification')}>
                        <option value="">All Qualifications</option>
                        {options.qualifications.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </label>

                <label className="jobs-filter-field">
                    <span>Organization</span>
                    <select className="input" aria-label="Organization" value={value.organization} onChange={handleInput('organization')}>
                        <option value="">All Organizations</option>
                        {options.organizations.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </label>

                <label className="jobs-filter-field">
                    <span>Sort</span>
                    <select
                        className="input"
                        aria-label="Sort"
                        value={sort}
                        onChange={(event) => onSortChange(event.target.value as 'newest' | 'oldest' | 'deadline' | 'views')}
                    >
                        {SORT_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                </label>

                <div className="jobs-filter-view-toggle" role="group" aria-label="Jobs view mode">
                    <button
                        type="button"
                        className={`category-view-btn${viewMode === 'compact' ? ' active' : ''}`}
                        onClick={() => onViewModeChange('compact')}
                    >
                        Compact
                    </button>
                    <button
                        type="button"
                        className={`category-view-btn${viewMode === 'card' ? ' active' : ''}`}
                        onClick={() => onViewModeChange('card')}
                    >
                        Cards
                    </button>
                </div>
            </div>

            <div className="jobs-filter-actions">
                <button type="button" className="btn btn-accent" onClick={onApply}>Apply Filters</button>
                <button type="button" className="btn btn-outline" onClick={onReset}>Reset</button>
            </div>
        </section>
    );
}

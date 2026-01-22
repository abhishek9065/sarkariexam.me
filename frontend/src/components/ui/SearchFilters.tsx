import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ContentType } from '../../types';
import './SearchFilters.css';

interface SearchFiltersProps {
    onFilterChange: (filters: FilterState) => void;
    locations?: string[];
    qualifications?: string[];
    showTypeFilter?: boolean;
    initialType?: ContentType | '';
    persistKey?: string;
    showRecentSearches?: boolean;
    includeAllTypes?: boolean;
}

export interface FilterState {
    keyword: string;
    type: ContentType | '';
    location: string;
    qualification: string;
    minAge: string;
    maxAge: string;
    sortBy: 'latest' | 'deadline' | 'posts' | 'title';
}

const TYPE_OPTIONS: { value: ContentType | ''; label: string; icon: string }[] = [
    { value: '', label: 'All Types', icon: '📋' },
    { value: 'job', label: 'Latest Jobs', icon: '💼' },
    { value: 'result', label: 'Results', icon: '📊' },
    { value: 'admit-card', label: 'Admit Cards', icon: '🎫' },
    { value: 'answer-key', label: 'Answer Keys', icon: '🔑' },
    { value: 'admission', label: 'Admissions', icon: '🎓' },
    { value: 'syllabus', label: 'Syllabus', icon: '📚' },
];

const DEFAULT_LOCATIONS = [
    'All India',
    'Delhi',
    'Mumbai',
    'Kolkata',
    'Chennai',
    'Bangalore',
    'Hyderabad',
    'Lucknow',
    'Patna',
    'Jaipur',
    'Chandigarh',
    'Pune',
    'Ahmedabad',
];

const DEFAULT_QUALIFICATIONS = [
    'Any',
    '8th Pass',
    '10th Pass',
    '12th Pass',
    'Graduate',
    'Post Graduate',
    'Diploma',
    'ITI',
    'B.Tech/B.E',
    'MBBS',
    'LLB',
    'B.Sc',
    'M.Sc',
    'PhD',
];

// Debounce hook for keyword search
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function SearchFilters({
    onFilterChange,
    locations = DEFAULT_LOCATIONS,
    qualifications = DEFAULT_QUALIFICATIONS,
    showTypeFilter = true,
    initialType = '',
    persistKey,
    showRecentSearches = true,
    includeAllTypes = true,
}: SearchFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        keyword: '',
        type: initialType,
        location: '',
        qualification: '',
        minAge: '',
        maxAge: '',
        sortBy: 'latest',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');
    const storageKey = persistKey ? `filters:${persistKey}` : null;
    const recentKey = persistKey ? `recent:${persistKey}` : 'recent:global';
    const pinnedKey = 'pinned-types';
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [pinnedTypes, setPinnedTypes] = useState<ContentType[]>([]);

    // Debounce keyword input
    const debouncedKeyword = useDebounce(keywordInput, 300);

    useEffect(() => {
        if (!storageKey) return;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw) as FilterState;
            const next = { ...saved, type: saved.type ?? initialType };
            setFilters(next);
            setKeywordInput(saved.keyword || '');
            onFilterChange(next);
        } catch {
            localStorage.removeItem(storageKey);
        }
    }, [storageKey, initialType, onFilterChange]);

    useEffect(() => {
        const raw = localStorage.getItem(recentKey);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw) as string[];
            setRecentSearches(saved);
        } catch {
            localStorage.removeItem(recentKey);
        }
    }, [recentKey]);

    useEffect(() => {
        const raw = localStorage.getItem(pinnedKey);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw) as ContentType[];
            setPinnedTypes(saved);
        } catch {
            localStorage.removeItem(pinnedKey);
        }
    }, []);

    // Update filters when debounced keyword changes
    useEffect(() => {
        if (debouncedKeyword !== filters.keyword) {
            const newFilters = { ...filters, keyword: debouncedKeyword };
            setFilters(newFilters);
            onFilterChange(newFilters);
        }
    }, [debouncedKeyword]);

    useEffect(() => {
        if (!storageKey) return;
        localStorage.setItem(storageKey, JSON.stringify(filters));
    }, [filters, storageKey]);

    useEffect(() => {
        if (!showRecentSearches || !debouncedKeyword.trim()) return;
        const keyword = debouncedKeyword.trim();
        const next = [keyword, ...recentSearches.filter((item) => item !== keyword)].slice(0, 6);
        if (next.join('|') === recentSearches.join('|')) return;
        setRecentSearches(next);
        localStorage.setItem(recentKey, JSON.stringify(next));
    }, [debouncedKeyword, recentKey, recentSearches, showRecentSearches]);

    const updateFilter = useCallback((key: keyof FilterState, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    }, [filters, onFilterChange]);

    const togglePin = (value: ContentType) => {
        setPinnedTypes((prev) => {
            const next = prev.includes(value)
                ? prev.filter((item) => item !== value)
                : [...prev, value];
            localStorage.setItem(pinnedKey, JSON.stringify(next));
            return next;
        });
    };

    const orderedTypeOptions = useMemo(() => {
        const baseOptions = includeAllTypes
            ? TYPE_OPTIONS
            : TYPE_OPTIONS.filter((option) => option.value);
        const pinned = baseOptions.filter((option) => option.value && pinnedTypes.includes(option.value as ContentType));
        const rest = baseOptions.filter((option) => !option.value || !pinnedTypes.includes(option.value as ContentType));
        return [...pinned, ...rest];
    }, [includeAllTypes, pinnedTypes]);

    const clearFilters = () => {
        const defaultFilters: FilterState = {
            keyword: '',
            type: initialType,
            location: '',
            qualification: '',
            minAge: '',
            maxAge: '',
            sortBy: 'latest',
        };
        setFilters(defaultFilters);
        setKeywordInput('');
        onFilterChange(defaultFilters);
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(defaultFilters));
        }
    };

    const hasActiveFilters = filters.keyword || filters.type || filters.location ||
        filters.qualification || filters.minAge || filters.maxAge;

    const activeFilterCount = [
        filters.keyword,
        filters.type,
        filters.location,
        filters.qualification,
        filters.minAge || filters.maxAge
    ].filter(Boolean).length;

    return (
        <div className="advanced-search-filters">
            {/* Quick Search Bar */}
            <div className="search-bar-container">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search jobs, results, admit cards..."
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                    />
                    {keywordInput && (
                        <button
                            className="clear-search-btn"
                            onClick={() => { setKeywordInput(''); updateFilter('keyword', ''); }}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button
                    className={`filter-toggle-btn ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <span className="filter-icon">⚙️</span>
                    <span className="filter-text">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="filter-badge">{activeFilterCount}</span>
                    )}
                </button>
                {hasActiveFilters && (
                    <button className="reset-filters-btn" onClick={clearFilters}>
                        Reset
                    </button>
                )}
            </div>

            {showRecentSearches && recentSearches.length > 0 && (
                <div className="recent-searches">
                    <span className="recent-label">Recent:</span>
                    {recentSearches.map((item) => (
                        <button
                            key={item}
                            className="recent-chip"
                            onClick={() => {
                                setKeywordInput(item);
                                updateFilter('keyword', item);
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}

            {/* Type Quick Filter Pills */}
            {showTypeFilter && (
                <div className="type-filter-pills">
                    {orderedTypeOptions.map(option => {
                        const isPinned = Boolean(option.value && pinnedTypes.includes(option.value as ContentType));
                        return (
                            <button
                                key={option.value}
                                className={`type-pill ${filters.type === option.value ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                                onClick={() => updateFilter('type', option.value)}
                            >
                                <span className="pill-icon">{option.icon}</span>
                                <span className="pill-label">{option.label}</span>
                                {option.value && (
                                    <span
                                        className={`pin-toggle ${isPinned ? 'active' : ''}`}
                                        role="button"
                                        aria-label={isPinned ? 'Unpin category' : 'Pin category'}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            togglePin(option.value as ContentType);
                                        }}
                                    >
                                        {isPinned ? '★' : '☆'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-header">
                        <h3>🎯 Advanced Filters</h3>
                        {hasActiveFilters && (
                            <button className="clear-all-btn" onClick={clearFilters}>
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>
                                <span className="label-icon">📍</span>
                                Location
                            </label>
                            <select
                                value={filters.location}
                                onChange={(e) => updateFilter('location', e.target.value)}
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>
                                <span className="label-icon">🎓</span>
                                Qualification
                            </label>
                            <select
                                value={filters.qualification}
                                onChange={(e) => updateFilter('qualification', e.target.value)}
                            >
                                <option value="">Any Qualification</option>
                                {qualifications.map(q => (
                                    <option key={q} value={q}>{q}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group age-filter">
                            <label>
                                <span className="label-icon">👤</span>
                                Age Range
                            </label>
                            <div className="age-inputs">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.minAge}
                                    onChange={(e) => updateFilter('minAge', e.target.value)}
                                    min="18"
                                    max="65"
                                />
                                <span className="age-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.maxAge}
                                    onChange={(e) => updateFilter('maxAge', e.target.value)}
                                    min="18"
                                    max="65"
                                />
                            </div>
                        </div>

                        <div className="filter-group">
                            <label>
                                <span className="label-icon">📊</span>
                                Sort By
                            </label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => updateFilter('sortBy', e.target.value as FilterState['sortBy'])}
                            >
                                <option value="latest">Latest First</option>
                                <option value="deadline">Deadline Soon</option>
                                <option value="posts">Most Vacancies</option>
                                <option value="title">Alphabetical</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filter Tags */}
                    {hasActiveFilters && (
                        <div className="active-filter-tags">
                            {filters.keyword && (
                                <span className="filter-tag">
                                    🔍 "{filters.keyword}"
                                    <button onClick={() => { setKeywordInput(''); updateFilter('keyword', ''); }}>✕</button>
                                </span>
                            )}
                            {filters.type && (
                                <span className="filter-tag">
                                    {TYPE_OPTIONS.find(t => t.value === filters.type)?.icon} {TYPE_OPTIONS.find(t => t.value === filters.type)?.label}
                                    <button onClick={() => updateFilter('type', '')}>✕</button>
                                </span>
                            )}
                            {filters.location && (
                                <span className="filter-tag">
                                    📍 {filters.location}
                                    <button onClick={() => updateFilter('location', '')}>✕</button>
                                </span>
                            )}
                            {filters.qualification && (
                                <span className="filter-tag">
                                    🎓 {filters.qualification}
                                    <button onClick={() => updateFilter('qualification', '')}>✕</button>
                                </span>
                            )}
                            {(filters.minAge || filters.maxAge) && (
                                <span className="filter-tag">
                                    👤 {filters.minAge || '18'} - {filters.maxAge || '65'} yrs
                                    <button onClick={() => { updateFilter('minAge', ''); updateFilter('maxAge', ''); }}>✕</button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchFilters;

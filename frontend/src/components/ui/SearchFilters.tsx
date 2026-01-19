import { useState, useEffect, useCallback } from 'react';
import type { ContentType } from '../../types';
import './SearchFilters.css';

interface SearchFiltersProps {
    onFilterChange: (filters: FilterState) => void;
    locations?: string[];
    qualifications?: string[];
    showTypeFilter?: boolean;
    initialType?: ContentType | '';
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
    initialType = ''
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

    // Debounce keyword input
    const debouncedKeyword = useDebounce(keywordInput, 300);

    // Update filters when debounced keyword changes
    useEffect(() => {
        if (debouncedKeyword !== filters.keyword) {
            const newFilters = { ...filters, keyword: debouncedKeyword };
            setFilters(newFilters);
            onFilterChange(newFilters);
        }
    }, [debouncedKeyword]);

    const updateFilter = useCallback((key: keyof FilterState, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    }, [filters, onFilterChange]);

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
            </div>

            {/* Type Quick Filter Pills */}
            {showTypeFilter && (
                <div className="type-filter-pills">
                    {TYPE_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            className={`type-pill ${filters.type === option.value ? 'active' : ''}`}
                            onClick={() => updateFilter('type', option.value)}
                        >
                            <span className="pill-icon">{option.icon}</span>
                            <span className="pill-label">{option.label}</span>
                        </button>
                    ))}
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

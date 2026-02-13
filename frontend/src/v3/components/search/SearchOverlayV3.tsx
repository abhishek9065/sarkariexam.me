import { useEffect, useRef } from 'react';
import type { SearchSuggestion } from '../../../types';
import type { SearchFilterTypeV3 } from '../../types';
import type { UseGlobalSearchV3Result } from '../../hooks/useGlobalSearchV3';

interface SearchOverlayV3Props {
    search: UseGlobalSearchV3Result;
}

const FILTERS: Array<{ value: SearchFilterTypeV3; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'job', label: 'Jobs' },
    { value: 'result', label: 'Results' },
    { value: 'admit-card', label: 'Admit Card' },
];

function suggestionMeta(item: SearchSuggestion): string {
    return item.organization || item.type;
}

export function SearchOverlayV3({ search }: SearchOverlayV3Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!search.open) return;
        const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
        return () => window.clearTimeout(timer);
    }, [search.open]);

    if (!search.open) return null;

    return (
        <div className="sr3-search-overlay" role="dialog" aria-modal="true" aria-label="Global search">
            <button type="button" className="sr3-search-backdrop" onClick={search.closeSearch} aria-label="Close search overlay" />
            <section className="sr3-search-modal sr3-surface">
                <header className="sr3-search-header">
                    <h2 className="sr3-section-title">Search Jobs, Results, Admit Cards</h2>
                    <button type="button" className="sr3-btn secondary" onClick={search.closeSearch}>Close</button>
                </header>

                <div className="sr3-search-input-row">
                    <input
                        ref={inputRef}
                        type="search"
                        value={search.query}
                        placeholder="Type exam, department, post name"
                        onChange={(event) => search.setQuery(event.target.value)}
                        aria-label="Global search query"
                    />
                    <button type="button" className="sr3-btn" onClick={search.submit}>Search</button>
                </div>

                <div className="sr3-search-filter-row" role="tablist" aria-label="Search filters">
                    {FILTERS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={`sr3-search-filter ${search.typeFilter === item.value ? 'active' : ''}`}
                            onClick={() => search.setTypeFilter(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {search.recentSearches.length > 0 && search.query.trim().length === 0 && (
                    <div className="sr3-search-meta-block">
                        <h3>Recent</h3>
                        <div className="sr3-meta-row">
                            {search.recentSearches.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className="sr3-link-chip"
                                    onClick={() => search.setQuery(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="sr3-search-results" role="listbox" aria-label="Search suggestions list">
                    {search.loading && <div className="sr3-loading">Loading suggestions...</div>}
                    {!search.loading && search.error && <div className="sr3-error">{search.error}</div>}
                    {!search.loading && !search.error && search.suggestions.length === 0 && (
                        <p className="sr3-empty">
                            {search.query.trim().length > 1 ? 'No suggestions found for this query.' : 'Start typing to see instant matches.'}
                        </p>
                    )}

                    {!search.loading && search.suggestions.map((item, index) => (
                        <button
                            key={`${item.slug}-${index}`}
                            type="button"
                            className={`sr3-search-result ${search.activeIndex === index ? 'active' : ''}`}
                            onMouseEnter={() => search.setActiveIndex(index)}
                            onClick={() => search.selectSuggestion(item)}
                        >
                            <strong>{item.title}</strong>
                            <span>{suggestionMeta(item)}</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default SearchOverlayV3;

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSearchSuggestions, fetchTrendingSearchTerms } from '../../utils/api';
import type { ContentType, SearchSuggestion } from '../../types';

type SearchOverlayTypeFilter = 'all' | 'job' | 'result' | 'admit-card';

interface SearchOverlayProps {
    open: boolean;
    onClose: () => void;
    onOpenDetail: (type: ContentType, slug: string) => void;
    onOpenCategory: (type: SearchOverlayTypeFilter, query: string) => void;
}

const RECENT_KEY = 'search-overlay-recent-v1';

const TYPE_FILTERS: Array<{ value: SearchOverlayTypeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'job', label: 'Jobs' },
    { value: 'result', label: 'Results' },
    { value: 'admit-card', label: 'Admit Cards' },
];

const loadRecentQueries = (): string[] => {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value): value is string => typeof value === 'string').slice(0, 8);
    } catch {
        return [];
    }
};

const storeRecentQuery = (query: string) => {
    const cleaned = query.trim();
    if (!cleaned) return;
    const current = loadRecentQueries();
    const next = [cleaned, ...current.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        // Ignore storage errors.
    }
};

const toBackendType = (filter: SearchOverlayTypeFilter): ContentType | undefined => (
    filter === 'all' ? undefined : filter
);

export function SearchOverlay({ open, onClose, onOpenDetail, onOpenCategory }: SearchOverlayProps) {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<SearchOverlayTypeFilter>('all');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [trendingQueries, setTrendingQueries] = useState<Array<{ query: string; count: number }>>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setRecentSearches(loadRecentQueries());
        setQuery('');
        setActiveIndex(-1);
        setError(null);
        setSuggestions([]);
        setTrendingQueries([]);
        const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchSearchSuggestions(query, {
                    type: toBackendType(typeFilter),
                    limit: 10,
                    source: 'suggest',
                });
                setSuggestions(data);
                setActiveIndex(-1);
            } catch (err) {
                console.error('Search suggest failed:', err);
                setError('Unable to load suggestions');
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => window.clearTimeout(timer);
    }, [open, query, typeFilter]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((prev) => {
                    if (suggestions.length === 0) return -1;
                    return prev >= suggestions.length - 1 ? 0 : prev + 1;
                });
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((prev) => {
                    if (suggestions.length === 0) return -1;
                    if (prev <= 0) return suggestions.length - 1;
                    return prev - 1;
                });
                return;
            }
            if (event.key === 'Enter') {
                if (activeIndex >= 0 && activeIndex < suggestions.length) {
                    event.preventDefault();
                    const suggestion = suggestions[activeIndex];
                    storeRecentQuery(suggestion.title);
                    onOpenDetail(suggestion.type, suggestion.slug);
                    onClose();
                    return;
                }
                if (query.trim()) {
                    event.preventDefault();
                    storeRecentQuery(query);
                    onOpenCategory(typeFilter, query.trim());
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeIndex, onClose, onOpenCategory, onOpenDetail, open, query, suggestions, typeFilter]);

    useEffect(() => {
        if (!open || query.trim().length > 0) return;
        let active = true;
        fetchTrendingSearchTerms({ days: 30, limit: 6 })
            .then((rows) => {
                if (!active) return;
                setTrendingQueries(rows);
            })
            .catch(() => {
                if (!active) return;
                setTrendingQueries([]);
            });
        return () => {
            active = false;
        };
    }, [open, query]);

    const showRecent = query.trim().length === 0 && recentSearches.length > 0;
    const trendingSuggestions = useMemo(
        () => (query.trim().length === 0 ? trendingQueries : []),
        [query, trendingQueries]
    );

    if (!open) return null;

    return (
        <div className="sr-search-overlay" role="dialog" aria-modal="true" aria-label="Global search">
            <div className="sr-search-backdrop" onClick={onClose} />
            <div className="sr-search-modal">
                <div className="sr-search-head">
                    <h2>Search Sarkari Updates</h2>
                    <button type="button" className="sr-search-close" onClick={onClose} aria-label="Close search">
                        ×
                    </button>
                </div>
                <div className="sr-search-input-wrap">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search jobs, results, admit cards..."
                        aria-label="Search query"
                    />
                    <button
                        type="button"
                        className="sr-search-submit"
                        onClick={() => {
                            if (!query.trim()) return;
                            storeRecentQuery(query);
                            onOpenCategory(typeFilter, query.trim());
                            onClose();
                        }}
                    >
                        Search
                    </button>
                </div>

                <div className="sr-search-filters" role="tablist" aria-label="Search type filters">
                    {TYPE_FILTERS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={`sr-search-filter ${typeFilter === item.value ? 'active' : ''}`}
                            onClick={() => setTypeFilter(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {showRecent && (
                    <div className="sr-search-meta-row">
                        <span className="sr-search-meta-title">Recent</span>
                        <div className="sr-search-chip-list">
                            {recentSearches.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className="sr-search-chip"
                                    onClick={() => setQuery(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {trendingSuggestions.length > 0 && (
                    <div className="sr-search-meta-row">
                        <span className="sr-search-meta-title">Trending</span>
                        <div className="sr-search-chip-list">
                            {trendingSuggestions.slice(0, 6).map((item) => (
                                <button
                                    key={`${item.query}-trend`}
                                    type="button"
                                    className="sr-search-chip"
                                    onClick={() => {
                                        storeRecentQuery(item.query);
                                        onOpenCategory(typeFilter, item.query);
                                        onClose();
                                    }}
                                >
                                    {item.query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="sr-search-results" role="listbox" aria-label="Search suggestions">
                    {loading && <div className="sr-search-state">Loading suggestions...</div>}
                    {!loading && error && <div className="sr-search-state error">{error}</div>}
                    {!loading && !error && suggestions.length === 0 && (
                        <div className="sr-search-state">
                            {query.trim().length >= 2 ? 'No matching suggestions yet.' : 'Type to get instant suggestions.'}
                        </div>
                    )}
                    {!loading && suggestions.map((item, index) => (
                        <button
                            key={`${item.slug}-${index}`}
                            type="button"
                            className={`sr-search-result-item ${index === activeIndex ? 'active' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => {
                                storeRecentQuery(item.title);
                                onOpenDetail(item.type, item.slug);
                                onClose();
                            }}
                        >
                            <strong>{item.title}</strong>
                            <span>{item.organization || item.type}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SearchOverlay;

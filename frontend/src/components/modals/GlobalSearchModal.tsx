import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ContentType } from '../../types';
import { fetchAnnouncementCardsPage } from '../../utils/api';
import { PATHS } from '../../utils/constants';
import { getDaysRemaining } from '../../utils';
import { prefetchAnnouncementDetail } from '../../utils/prefetch';

type SearchFilterType = 'job' | 'result' | 'admit-card';

type SearchResult = {
    id: string;
    slug: string;
    title: string;
    type: ContentType;
    organization?: string;
    deadline?: string | null;
    totalPosts?: number | null;
    viewCount?: number | null;
};

interface GlobalSearchModalProps {
    open: boolean;
    onClose: () => void;
}

const FILTER_OPTIONS: Array<{ type: SearchFilterType; label: string }> = [
    { type: 'job', label: 'Jobs' },
    { type: 'result', label: 'Results' },
    { type: 'admit-card', label: 'Admit Cards' },
];

const TRENDING_TERMS = ['UPSC', 'SSC', 'Railway', 'Banking', 'State PSC'];
const RECENT_KEY = 'global-search-recent';

function isSearchFilterType(value: ContentType): value is SearchFilterType {
    return value === 'job' || value === 'result' || value === 'admit-card';
}

function formatShortDate(value?: string | null) {
    if (!value) return 'Date not listed';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not listed';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function loadRecentSearches() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6)
            : [];
    } catch {
        return [];
    }
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
    const [selectedTypes, setSelectedTypes] = useState<SearchFilterType[]>(['job', 'result', 'admit-card']);
    const [rawResults, setRawResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 220);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 20);

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose, open]);

    useEffect(() => {
        if (!open) {
            setLoading(false);
            setError(null);
            return;
        }

        if (debouncedQuery.length < 2) {
            setLoading(false);
            setError(null);
            setRawResults([]);
            return;
        }

        let active = true;
        setLoading(true);
        setError(null);

        fetchAnnouncementCardsPage({ search: debouncedQuery, limit: 24 })
            .then((response) => {
                if (!active) return;
                const mapped = (response.data || [])
                    .map((item) => {
                        const card = item as {
                            id: string | number;
                            slug: string;
                            title: string;
                            type: ContentType;
                            organization?: string;
                            deadline?: string | null;
                            totalPosts?: number | null;
                            viewCount?: number | null;
                        };
                        return {
                            id: String(card.id),
                            slug: card.slug,
                            title: card.title,
                            type: card.type,
                            organization: card.organization,
                            deadline: card.deadline,
                            totalPosts: card.totalPosts,
                            viewCount: card.viewCount,
                        } as SearchResult;
                    })
                    .filter((entry) => isSearchFilterType(entry.type));
                setRawResults(mapped);
            })
            .catch((searchError) => {
                console.error(searchError);
                if (!active) return;
                setRawResults([]);
                setError('Unable to fetch search results right now.');
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [debouncedQuery, open]);

    const visibleResults = useMemo(
        () => rawResults.filter((item) => selectedTypes.includes(item.type as SearchFilterType)),
        [rawResults, selectedTypes]
    );

    const suggestions = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return [];

        const resultTitles = rawResults
            .map((item) => item.title)
            .filter((title, index, all) => all.indexOf(title) === index)
            .filter((title) => title.toLowerCase().includes(needle));

        const trendMatches = TRENDING_TERMS.filter((term) => term.toLowerCase().includes(needle));

        return [...resultTitles, ...trendMatches].slice(0, 6);
    }, [query, rawResults]);

    const hasActiveQuery = debouncedQuery.length >= 2;

    const persistRecentSearch = (value: string) => {
        const normalized = value.trim();
        if (normalized.length < 2) return;
        setRecentSearches((previous) => {
            const next = [
                normalized,
                ...previous.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
            ].slice(0, 6);
            try {
                localStorage.setItem(RECENT_KEY, JSON.stringify(next));
            } catch {
                // Ignore storage errors.
            }
            return next;
        });
    };

    const toggleType = (type: SearchFilterType) => {
        setSelectedTypes((previous) => {
            if (previous.includes(type)) {
                if (previous.length === 1) {
                    return previous;
                }
                return previous.filter((entry) => entry !== type);
            }
            return [...previous, type];
        });
    };

    const handlePickResult = (item: SearchResult) => {
        persistRecentSearch(query || item.title);
        onClose();
        navigate(`/${item.type}/${item.slug}`);
    };

    const handleQuickSearch = (value: string) => {
        setQuery(value);
        persistRecentSearch(value);
    };

    const handleListingNavigation = (type: SearchFilterType) => {
        persistRecentSearch(type);
        onClose();
        navigate(PATHS[type]);
    };

    if (!open) return null;

    return (
        <div className="sr-v2-search-overlay" onClick={onClose}>
            <div
                className="sr-v2-search-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sr-v2-search-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="sr-v2-search-header">
                    <div>
                        <h2 id="sr-v2-search-title">Search Sarkari Updates</h2>
                        <p>Instant results with type filters and quick suggestions.</p>
                    </div>
                    <button type="button" className="sr-v2-search-close" onClick={onClose} aria-label="Close search">
                        x
                    </button>
                </header>

                <div className="sr-v2-search-input-wrap">
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search jobs, results, admit cards..."
                        className="sr-v2-search-input"
                        aria-label="Search announcements"
                    />
                    {query && (
                        <button
                            type="button"
                            className="sr-v2-search-clear"
                            onClick={() => {
                                setQuery('');
                                setDebouncedQuery('');
                            }}
                            aria-label="Clear search"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <section className="sr-v2-search-filters" aria-label="Filter by type">
                    {FILTER_OPTIONS.map((option) => (
                        <label key={option.type} className="sr-v2-search-filter-chip">
                            <input
                                type="checkbox"
                                checked={selectedTypes.includes(option.type)}
                                onChange={() => toggleType(option.type)}
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </section>

                {suggestions.length > 0 && (
                    <section className="sr-v2-search-suggestions" aria-label="Search suggestions">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                className="sr-v2-search-suggestion"
                                onClick={() => handleQuickSearch(suggestion)}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </section>
                )}

                {!hasActiveQuery && (
                    <section className="sr-v2-search-discovery" aria-label="Popular and recent searches">
                        <div>
                            <h3>Trending</h3>
                            <div className="sr-v2-search-chip-row">
                                {TRENDING_TERMS.map((term) => (
                                    <button
                                        type="button"
                                        key={term}
                                        className="sr-v2-search-suggestion"
                                        onClick={() => handleQuickSearch(term)}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {recentSearches.length > 0 && (
                            <div>
                                <h3>Recent</h3>
                                <div className="sr-v2-search-chip-row">
                                    {recentSearches.map((term) => (
                                        <button
                                            type="button"
                                            key={term}
                                            className="sr-v2-search-suggestion"
                                            onClick={() => handleQuickSearch(term)}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <section className="sr-v2-search-results" aria-live="polite">
                    {loading ? (
                        <p className="sr-v2-search-status">Searching...</p>
                    ) : error ? (
                        <p className="sr-v2-search-status error">{error}</p>
                    ) : hasActiveQuery ? (
                        visibleResults.length > 0 ? (
                            <ul>
                                {visibleResults.slice(0, 12).map((item) => {
                                    const daysRemaining = getDaysRemaining(item.deadline ?? undefined);
                                    return (
                                        <li key={`${item.id}-${item.slug}`}>
                                            <button
                                                type="button"
                                                className="sr-v2-search-result"
                                                onClick={() => handlePickResult(item)}
                                                onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                                onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                            >
                                                <span className="sr-v2-search-result-head">
                                                    <strong>{item.title}</strong>
                                                    <span className={`sr-v2-search-type sr-v2-search-type-${item.type}`}>
                                                        {item.type}
                                                    </span>
                                                </span>
                                                <span className="sr-v2-search-result-meta">
                                                    {item.organization || 'Government'}
                                                    {' | '}
                                                    {daysRemaining !== null && daysRemaining >= 0
                                                        ? `${daysRemaining} days left`
                                                        : formatShortDate(item.deadline)}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="sr-v2-search-status">No matches found for "{debouncedQuery}".</p>
                        )
                    ) : (
                        <p className="sr-v2-search-status">Type at least 2 characters to start searching.</p>
                    )}
                </section>

                <footer className="sr-v2-search-footer" aria-label="Quick listing links">
                    <button type="button" className="btn btn-secondary" onClick={() => handleListingNavigation('job')}>
                        Browse Jobs
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => handleListingNavigation('result')}>
                        Browse Results
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => handleListingNavigation('admit-card')}>
                        Browse Admit Cards
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default GlobalSearchModal;

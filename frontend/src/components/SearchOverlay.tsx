import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchSuggestions, getTrendingSearches } from '../utils/api';
import type { SearchSuggestion, ContentType } from '../types';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import { trackEvent } from '../utils/analytics';

const TYPE_ICONS: Record<ContentType, string> = {
    job: '💼',
    result: '📊',
    'admit-card': '🎫',
    'answer-key': '🔑',
    admission: '🎓',
    syllabus: '📚',
};

const QUICK_FILTERS: Array<{ label: string; query: string }> = [
    { label: 'SSC', query: 'SSC' },
    { label: 'UPSC', query: 'UPSC' },
    { label: 'Railway', query: 'Railway' },
    { label: 'Bank', query: 'Bank' },
    { label: 'Defence', query: 'Defence' },
    { label: 'Police', query: 'Police' },
];

const RECENT_KEY = 'sr_recent_searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, MAX_RECENT);
    } catch { return []; }
}

function pushRecentSearch(term: string) {
    try {
        const existing = getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
        existing.unshift(term);
        localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
    } catch { /* noop */ }
}

function clearRecentSearches() {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* noop */ }
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const FALLBACK_TRENDING = ['UPSC', 'SSC CGL', 'RRB ALP', 'NEET', 'Bank PO', 'India Post'];

export function SearchOverlay({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [trendingTerms, setTrendingTerms] = useState<string[]>(FALLBACK_TRENDING);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;

        setTimeout(() => inputRef.current?.focus(), 100);
        setQuery('');
        setSuggestions([]);
        setSelectedIdx(-1);
        setRecentSearches(getRecentSearches());
        trackEvent('search_open');

        let mounted = true;
        (async () => {
            try {
                const res = await getTrendingSearches(30, 8);
                const terms = (res.data || [])
                    .map((entry) => entry.query?.trim())
                    .filter((item): item is string => Boolean(item));
                if (mounted && terms.length > 0) {
                    setTrendingTerms(terms);
                }
            } catch {
                if (mounted) {
                    setTrendingTerms(FALLBACK_TRENDING);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isOpen]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await getSearchSuggestions(query);
                setSuggestions(res.data);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    const goTo = useCallback((suggestion: SearchSuggestion) => {
        pushRecentSearch(suggestion.title);
        trackEvent('search_select', { type: suggestion.type, slug: suggestion.slug });
        navigate(buildAnnouncementDetailPath(suggestion.type, suggestion.slug, 'search_overlay'));
        onClose();
    }, [navigate, onClose]);

    const openSearchResults = useCallback((term: string) => {
        const cleaned = term.trim();
        if (!cleaned) return;
        pushRecentSearch(cleaned);
        trackEvent('search_submit', { query: cleaned });
        navigate(`/jobs?q=${encodeURIComponent(cleaned)}&source=search_overlay`);
        onClose();
    }, [navigate, onClose]);

    const handleClearRecent = useCallback(() => {
        clearRecentSearches();
        setRecentSearches([]);
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIdx((value) => Math.min(value + 1, suggestions.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIdx((value) => Math.max(value - 1, -1));
            return;
        }

        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        if (selectedIdx >= 0 && suggestions[selectedIdx]) {
            goTo(suggestions[selectedIdx]);
            return;
        }

        openSearchResults(query);
    };

    if (!isOpen) return null;

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="search-overlay-content animate-slide-up" onClick={(event) => event.stopPropagation()}>
                <div className="search-input-wrapper">
                    <span className="search-input-icon">🔍</span>
                    <input
                        ref={inputRef}
                        className="search-input"
                        type="text"
                        placeholder="Search jobs, results, admit cards..."
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedIdx(-1);
                        }}
                        onKeyDown={handleKeyDown}
                        aria-label="Search announcements"
                        aria-controls="search-results-list"
                        aria-expanded={suggestions.length > 0}
                        role="combobox"
                    />
                    <div className="sr-only" aria-live="polite">
                        {loading ? 'Searching...' : ''}
                        {!loading && suggestions.length > 0 ? `${suggestions.length} suggestions found. Use up and down arrows to review.` : ''}
                        {!loading && query.length >= 2 && suggestions.length === 0 ? 'No results found.' : ''}
                    </div>
                    <button type="button" className="search-close-btn" onClick={onClose} aria-label="Close search">
                        ✕
                    </button>
                </div>

                {query.trim().length === 0 && (
                    <div className="search-idle-panels">
                        {/* Quick Filters */}
                        <div className="search-quick-filters">
                            <h3>Quick Filters</h3>
                            <div className="search-quick-chips">
                                {QUICK_FILTERS.map((f) => (
                                    <button
                                        key={f.query}
                                        type="button"
                                        className="search-quick-chip"
                                        onClick={() => openSearchResults(f.query)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="search-recent-panel">
                                <div className="search-panel-header">
                                    <h3>Recent Searches</h3>
                                    <button type="button" className="search-clear-btn" onClick={handleClearRecent}>Clear</button>
                                </div>
                                <div className="search-recent-list">
                                    {recentSearches.map((term) => (
                                        <button
                                            key={term}
                                            type="button"
                                            className="search-recent-item"
                                            onClick={() => openSearchResults(term)}
                                        >
                                            <span className="search-recent-icon">🕐</span>
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trending Searches */}
                        <div className="search-trending-panel">
                            <h3>🔥 Trending Searches</h3>
                            <div className="search-trending-chips">
                                {trendingTerms.map((term) => (
                                    <button
                                        key={term}
                                        type="button"
                                        className="search-trending-chip"
                                        onClick={() => openSearchResults(term)}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="search-loading">
                        <div className="spinner" style={{ width: 20, height: 20 }} />
                    </div>
                )}

                {suggestions.length > 0 && (
                    <ul id="search-results-list" className="search-suggestions" role="listbox" aria-label="Search suggestions">
                        {suggestions.map((item, index) => (
                            <li
                                key={`${item.type}-${item.slug}`}
                                className={`search-suggestion${index === selectedIdx ? ' selected' : ''}`}
                                onClick={() => goTo(item)}
                                onMouseEnter={() => setSelectedIdx(index)}
                                role="option"
                                aria-selected={index === selectedIdx}
                            >
                                <span className="search-suggestion-icon">{TYPE_ICONS[item.type]}</span>
                                <div className="search-suggestion-info">
                                    <span className="search-suggestion-title">{item.title}</span>
                                    {item.organization && (
                                        <span className="search-suggestion-org">{item.organization}</span>
                                    )}
                                </div>
                                <span className={`badge badge-${item.type}`} style={{ fontSize: '0.65rem' }}>
                                    {item.type}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && query.length >= 2 && suggestions.length === 0 && (
                    <div className="search-empty">
                        <p>
                            No direct matches for <strong>{query}</strong>
                        </p>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openSearchResults(query)}
                        >
                            Search all jobs for this term
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchSuggestions, getTrendingSearches } from '../utils/api';
import type { SearchSuggestion, ContentType } from '../types';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';

const TYPE_ICONS: Record<ContentType, string> = {
    job: '💼',
    result: '📊',
    'admit-card': '🎫',
    'answer-key': '🔑',
    admission: '🎓',
    syllabus: '📚',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const FALLBACK_TRENDING = ['UPSC', 'SSC CGL', 'RRB ALP', 'NEET', 'Bank PO', 'India Post'];

export function SearchOverlay({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [trendingTerms, setTrendingTerms] = useState<string[]>(FALLBACK_TRENDING);
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
        if (query.length < 1) {
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
        navigate(buildAnnouncementDetailPath(suggestion.type, suggestion.slug, 'search_overlay'));
        onClose();
    }, [navigate, onClose]);

    const openSearchResults = useCallback((term: string) => {
        const cleaned = term.trim();
        if (!cleaned) return;
        navigate(`/jobs?q=${encodeURIComponent(cleaned)}&source=search_overlay`);
        onClose();
    }, [navigate, onClose]);

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
                    />
                    <button type="button" className="search-close-btn" onClick={onClose} aria-label="Close search">
                        ✕
                    </button>
                </div>

                {query.trim().length === 0 && (
                    <div className="search-trending-panel">
                        <h3>Trending Searches</h3>
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
                )}

                {loading && (
                    <div className="search-loading">
                        <div className="spinner" style={{ width: 20, height: 20 }} />
                    </div>
                )}

                {suggestions.length > 0 && (
                    <ul className="search-suggestions" role="listbox" aria-label="Search suggestions">
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

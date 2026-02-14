import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchSuggestions } from '../utils/api';
import type { SearchSuggestion, ContentType } from '../types';

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

export function SearchOverlay({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Focus input when overlay opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSuggestions([]);
            setSelectedIdx(-1);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Debounced search
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

    const goTo = useCallback(
        (suggestion: SearchSuggestion) => {
            navigate(`/${suggestion.type}/${suggestion.slug}`);
            onClose();
        },
        [navigate, onClose],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && selectedIdx >= 0 && suggestions[selectedIdx]) {
            goTo(suggestions[selectedIdx]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="search-overlay-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="search-input-wrapper">
                    <span className="search-input-icon">🔍</span>
                    <input
                        ref={inputRef}
                        className="search-input"
                        type="text"
                        placeholder="Search jobs, results, admit cards..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIdx(-1);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="search-close-btn" onClick={onClose}>✕</button>
                </div>

                {loading && (
                    <div className="search-loading">
                        <div className="spinner" style={{ width: 20, height: 20 }} />
                    </div>
                )}

                {suggestions.length > 0 && (
                    <ul className="search-suggestions">
                        {suggestions.map((s, i) => (
                            <li
                                key={`${s.type}-${s.slug}`}
                                className={`search-suggestion${i === selectedIdx ? ' selected' : ''}`}
                                onClick={() => goTo(s)}
                                onMouseEnter={() => setSelectedIdx(i)}
                            >
                                <span className="search-suggestion-icon">{TYPE_ICONS[s.type]}</span>
                                <div className="search-suggestion-info">
                                    <span className="search-suggestion-title">{s.title}</span>
                                    {s.organization && (
                                        <span className="search-suggestion-org">{s.organization}</span>
                                    )}
                                </div>
                                <span className={`badge badge-${s.type}`} style={{ fontSize: '0.65rem' }}>
                                    {s.type}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && query.length >= 2 && suggestions.length === 0 && (
                    <div className="search-empty">
                        <p>No results found for "<strong>{query}</strong>"</p>
                    </div>
                )}
            </div>
        </div>
    );
}

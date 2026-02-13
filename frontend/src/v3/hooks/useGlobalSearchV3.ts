import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSearchSuggestions } from '../../utils/api';
import type { ContentType, SearchSuggestion } from '../../types';
import type { GlobalSearchState, SearchFilterTypeV3 } from '../types';

const RECENT_KEY = 'sr3-search-recent-v1';

const toBackendType = (typeFilter: SearchFilterTypeV3): ContentType | undefined => (
    typeFilter === 'all' ? undefined : typeFilter
);

const loadRecentSearches = (): string[] => {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is string => typeof item === 'string').slice(0, 8);
    } catch {
        return [];
    }
};

const saveRecentSearch = (query: string) => {
    const value = query.trim();
    if (!value) return;
    const next = [value, ...loadRecentSearches().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        // Ignore storage errors.
    }
};

export interface UseGlobalSearchV3Options {
    onOpenDetail: (type: ContentType, slug: string) => void;
    onOpenCategory: (filter: SearchFilterTypeV3, query: string) => void;
}

export interface UseGlobalSearchV3Result extends GlobalSearchState {
    openSearch: () => void;
    closeSearch: () => void;
    setQuery: (query: string) => void;
    setTypeFilter: (value: SearchFilterTypeV3) => void;
    submit: () => void;
    selectSuggestion: (suggestion: SearchSuggestion) => void;
    setActiveIndex: (index: number) => void;
}

export function useGlobalSearchV3({ onOpenDetail, onOpenCategory }: UseGlobalSearchV3Options): UseGlobalSearchV3Result {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<SearchFilterTypeV3>('all');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    const closeSearch = useCallback(() => {
        setOpen(false);
        setActiveIndex(-1);
        setError(null);
    }, []);

    const openSearch = useCallback(() => {
        setOpen(true);
        setRecentSearches(loadRecentSearches());
    }, []);

    const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
        saveRecentSearch(suggestion.title);
        onOpenDetail(suggestion.type, suggestion.slug);
        closeSearch();
    }, [closeSearch, onOpenDetail]);

    const submit = useCallback(() => {
        const trimmed = query.trim();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
            const selected = suggestions[activeIndex];
            selectSuggestion(selected);
            return;
        }
        if (!trimmed) return;
        saveRecentSearch(trimmed);
        onOpenCategory(typeFilter, trimmed);
        closeSearch();
    }, [activeIndex, closeSearch, onOpenCategory, query, selectSuggestion, suggestions, typeFilter]);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchSearchSuggestions(query.trim(), {
                    type: toBackendType(typeFilter),
                    limit: 12,
                });
                setSuggestions(data);
                setActiveIndex(-1);
            } catch {
                setError('Unable to load suggestions right now.');
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => window.clearTimeout(timer);
    }, [open, query, typeFilter]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTypingContext = Boolean(
                target && (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                )
            );

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openSearch();
                return;
            }

            if (!open && event.key === '/' && !isTypingContext) {
                event.preventDefault();
                openSearch();
                return;
            }

            if (!open) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                closeSearch();
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
                event.preventDefault();
                submit();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [closeSearch, open, openSearch, submit, suggestions.length]);

    const state = useMemo<UseGlobalSearchV3Result>(() => ({
        open,
        query,
        typeFilter,
        suggestions,
        recentSearches,
        loading,
        error,
        activeIndex,
        openSearch,
        closeSearch,
        setQuery,
        setTypeFilter,
        submit,
        selectSuggestion,
        setActiveIndex,
    }), [
        activeIndex,
        closeSearch,
        error,
        loading,
        open,
        openSearch,
        query,
        recentSearches,
        selectSuggestion,
        submit,
        suggestions,
        typeFilter,
    ]);

    return state;
}

export default useGlobalSearchV3;

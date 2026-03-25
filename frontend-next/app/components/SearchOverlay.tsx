'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSearchSuggestions, getTrendingSearches } from '@/app/lib/api';
import { getFallbackSearchSuggestions, getFallbackTrendingSearches } from '@/app/lib/fallbackData';
import { EXAM_FAMILY_SHORTCUTS, CATEGORY_META, copyFor, groupSuggestionsByType } from '@/app/lib/ui';
import type { SearchSuggestion } from '@/app/lib/types';
import { trackEvent } from '@/app/lib/analytics';
import { buildAnnouncementDetailPath } from '@/app/lib/urls';
import { useLanguage } from '@/app/lib/useLanguage';
import { withTimeout } from '@/app/lib/withTimeout';
import { Icon } from '@/app/components/Icon';
import styles from './SearchOverlay.module.css';

const RECENT_KEY = 'sr_recent_search_terms_v3';
const MAX_RECENT = 8;
const FALLBACK_TRENDING = getFallbackTrendingSearches();

function getRecentSearchTerms(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
    } catch {
        return [];
    }
}

function pushRecentSearchTerm(value: string) {
    if (typeof window === 'undefined') return;
    const next = getRecentSearchTerms().filter((item) => item.toLowerCase() !== value.toLowerCase());
    next.unshift(value);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
}

function clearRecentSearchTerms() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(RECENT_KEY);
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: Props) {
    const router = useRouter();
    const { language } = useLanguage();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [recent, setRecent] = useState<string[]>([]);
    const [trending, setTrending] = useState<string[]>(FALLBACK_TRENDING);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
        setRecent(getRecentSearchTerms());
        setQuery('');
        setSuggestions([]);
        setSelectedIndex(-1);
        trackEvent('search_overlay_open');

        let cancelled = false;
        void (async () => {
            try {
                const response = await withTimeout(getTrendingSearches(30, 8), 2500);
                if (cancelled) return;
                const next = (response.data ?? [])
                    .map((item) => item.query?.trim())
                    .filter((item): item is string => Boolean(item));
                if (next.length > 0) setTrending(next);
            } catch {
                if (!cancelled) setTrending(FALLBACK_TRENDING);
            }
        })();

        return () => {
            cancelled = true;
            window.clearTimeout(focusTimer);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const term = query.trim();
        if (term.length < 2) {
            setSuggestions([]);
            setSelectedIndex(-1);
            return;
        }

        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const response = await withTimeout(getSearchSuggestions(term), 2500);
                const next = response.data ?? [];
                setSuggestions(next.length > 0 ? next : getFallbackSearchSuggestions(term));
                setSelectedIndex(-1);
            } catch {
                setSuggestions(getFallbackSearchSuggestions(term));
                setSelectedIndex(-1);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => window.clearTimeout(timer);
    }, [isOpen, query]);

    const groupedSuggestions = useMemo(() => groupSuggestionsByType(suggestions), [suggestions]);

    const openSearchResults = useCallback((value: string) => {
        const next = value.trim();
        if (!next) return;
        pushRecentSearchTerm(next);
        setRecent(getRecentSearchTerms());
        trackEvent('search_submit', { query: next, surface: 'global_overlay' });
        router.push(`/jobs?q=${encodeURIComponent(next)}&source=search_overlay`);
        onClose();
    }, [onClose, router]);

    const openSuggestion = useCallback((item: SearchSuggestion) => {
        pushRecentSearchTerm(item.title);
        setRecent(getRecentSearchTerms());
        trackEvent('search_suggestion_open', { slug: item.slug, type: item.type });
        router.push(buildAnnouncementDetailPath(item.type, item.slug, 'search_overlay'));
        onClose();
    }, [onClose, router]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const flatSuggestions = groupedSuggestions.flatMap((group) => group.items);
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((current) => Math.min(current + 1, flatSuggestions.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((current) => Math.max(current - 1, -1));
            return;
        }
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const selected = flatSuggestions[selectedIndex];
        if (selected) {
            openSuggestion(selected);
            return;
        }
        openSearchResults(query);
    };

    const suggestionIndexOffset = useMemo(() => {
        const offsets = new Map<string, number>();
        let cursor = 0;
        groupedSuggestions.forEach((group) => {
            offsets.set(group.type, cursor);
            cursor += group.items.length;
        });
        return offsets;
    }, [groupedSuggestions]);

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Search portal" onClick={onClose}>
            <div className={`${styles.panel} animate-slide-up`} onClick={(event) => event.stopPropagation()}>
                <div className={styles.inputRow}>
                    <span className={styles.inputIcon}><Icon name="Search" /></span>
                    <input
                        ref={inputRef}
                        type="search"
                        className={styles.input}
                        placeholder={copyFor(language, 'Search jobs, results, boards, or states', 'जॉब्स, रिजल्ट, बोर्ड या स्टेट सर्च करें')}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedIndex(-1);
                        }}
                        onKeyDown={handleKeyDown}
                        aria-label={copyFor(language, 'Search jobs and exams', 'जॉब्स और एग्जाम सर्च करें')}
                    />
                    <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close search">
                        <Icon name="Close" />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.leftPane}>
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>{copyFor(language, 'Exam families', 'एग्जाम फैमिली')}</h2>
                                <p>{copyFor(language, 'Jump straight into the most common searches.', 'सबसे कॉमन सर्च पर सीधे जाएं।')}</p>
                            </div>
                            <div className={styles.chipGrid}>
                                {EXAM_FAMILY_SHORTCUTS.map((item) => (
                                    <button key={item.label} type="button" className={styles.chip} onClick={() => openSearchResults(item.label)}>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>{copyFor(language, 'Trending now', 'अभी ट्रेंडिंग')}</h2>
                                <p>{copyFor(language, 'Popular search terms from recent user activity.', 'हाल की यूजर एक्टिविटी के लोकप्रिय सर्च टर्म।')}</p>
                            </div>
                            <div className={styles.trendingList}>
                                {trending.map((item) => (
                                    <button key={item} type="button" className={styles.trendingItem} onClick={() => openSearchResults(item)}>
                                        <span className={styles.trendingSpark}><Icon name="Sparkles" /></span>
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className={styles.rightPane}>
                        {query.trim().length === 0 ? (
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h2>{copyFor(language, 'Recent searches', 'हाल की सर्च')}</h2>
                                    <button type="button" className={styles.textAction} onClick={() => { clearRecentSearchTerms(); setRecent([]); }}>
                                        {copyFor(language, 'Clear', 'क्लियर')}
                                    </button>
                                </div>
                                {recent.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <Icon name="Clock3" />
                                        <p>{copyFor(language, 'Your recent searches will appear here.', 'आपकी हाल की सर्च यहाँ दिखेगी।')}</p>
                                    </div>
                                ) : (
                                    <div className={styles.recentList}>
                                        {recent.map((item) => (
                                            <button key={item} type="button" className={styles.recentItem} onClick={() => openSearchResults(item)}>
                                                <span>{item}</span>
                                                <Icon name="ArrowRight" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ) : loading ? (
                            <div className={styles.loadingState}>
                                <div className={styles.loadingDot} />
                                <p>{copyFor(language, 'Finding official updates…', 'ऑफिशियल अपडेट खोजे जा रहे हैं…')}</p>
                            </div>
                        ) : groupedSuggestions.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Icon name="Search" />
                                <p>{copyFor(language, 'No direct matches. Search the full jobs feed with this term.', 'सीधा मैच नहीं मिला। इस टर्म से पूरा जॉब फीड खोजें।')}</p>
                                <button type="button" className={styles.primaryButton} onClick={() => openSearchResults(query)}>
                                    {copyFor(language, 'Search all jobs', 'सभी जॉब्स सर्च करें')}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.resultsList} role="listbox" aria-label="Search results">
                                {groupedSuggestions.map((group) => (
                                    <section key={group.type} className={styles.resultGroup}>
                                        <div className={styles.resultGroupHeader}>
                                            <span className={styles.resultGroupIcon}>{CATEGORY_META[group.type].icon}</span>
                                            <h3>{copyFor(language, CATEGORY_META[group.type].labelEn, CATEGORY_META[group.type].labelHi)}</h3>
                                        </div>
                                        <div className={styles.groupItems}>
                                            {group.items.map((item, index) => {
                                                const absoluteIndex = (suggestionIndexOffset.get(group.type) ?? 0) + index;
                                                return (
                                                    <button
                                                        key={`${item.type}-${item.slug}`}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={absoluteIndex === selectedIndex}
                                                        className={`${styles.resultItem}${absoluteIndex === selectedIndex ? ` ${styles.resultItemActive}` : ''}`}
                                                        onClick={() => openSuggestion(item)}
                                                        onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                                                    >
                                                        <div>
                                                            <strong>{item.title}</strong>
                                                            {item.organization && <span>{item.organization}</span>}
                                                        </div>
                                                        <Icon name="ArrowRight" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

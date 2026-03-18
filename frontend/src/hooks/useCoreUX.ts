import React, { useEffect, useCallback, useRef, useState } from 'react';

/**
 * UX: A11y Modal & Bottom Sheet Lock
 * Traps the escape key to close modals and locks the body scroll to prevent background scrolling.
 * Uses a ref for the callback to prevent unnecessary re-renders.
 */
export function useModalLock(isOpen: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        
        const handleEsc = (e: KeyboardEvent) => { 
            if (e.key === 'Escape') onCloseRef.current(); 
        };
        window.addEventListener('keydown', handleEsc);
        
        return () => { 
            document.body.style.overflow = ''; 
            window.removeEventListener('keydown', handleEsc); 
        };
    }, [isOpen]);
}

/**
 * UX: Zero-Click Infinite Scroll
 * Fires the load callback when the attached ref element comes into view.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
    hasMore: boolean,
    isFetching: boolean,
    onLoadMore: () => void,
    rootMargin: string = '400px'
) {
    const loadMoreRef = useRef<T>(null);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);

    useEffect(() => {
        if (!hasMore || isFetching) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMoreRef.current();
            },
            { rootMargin }
        );
        
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, [hasMore, isFetching, rootMargin]);

    return loadMoreRef;
}

/**
 * UX: Keyboard Navigation for Lists
 * Provides arrow key and enter key navigation for predictive search and dropdowns.
 */
export function useKeyboardListNav(
    itemCount: number,
    isOpen: boolean,
    onSelect: (index: number) => void
) {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const onSelectRef = useRef(onSelect);

    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

    useEffect(() => {
        if (!isOpen) setSelectedIndex(-1);
    }, [isOpen, itemCount]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLElement>) => {
        if (!isOpen || itemCount === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            onSelectRef.current(selectedIndex);
        }
    }, [isOpen, itemCount, selectedIndex]);

    return { selectedIndex, handleKeyDown, setSelectedIndex };
}
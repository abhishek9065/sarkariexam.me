import { useMemo, useState } from 'react';
import type { Announcement } from '../../types';

const MAX_COMPARE_ITEMS = 3;

const keyOf = (item: Announcement) => item.id || item.slug;

export interface UseCompareV3Result {
    selections: Announcement[];
    isOpen: boolean;
    maxItems: number;
    open: () => void;
    close: () => void;
    clear: () => void;
    add: (item: Announcement) => void;
    remove: (item: Announcement | string) => void;
    toggle: (item: Announcement) => void;
    isSelected: (item: Announcement) => boolean;
    canAddMore: boolean;
}

export function useCompareV3(): UseCompareV3Result {
    const [selections, setSelections] = useState<Announcement[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const add = (item: Announcement) => {
        if (item.type !== 'job') return;
        const key = keyOf(item);
        if (!key) return;

        setSelections((prev) => {
            if (prev.some((entry) => keyOf(entry) === key)) return prev;
            if (prev.length >= MAX_COMPARE_ITEMS) return prev;
            return [...prev, item];
        });
    };

    const remove = (item: Announcement | string) => {
        const target = typeof item === 'string' ? item : keyOf(item);
        setSelections((prev) => prev.filter((entry) => keyOf(entry) !== target));
    };

    const toggle = (item: Announcement) => {
        const key = keyOf(item);
        if (!key) return;
        setSelections((prev) => {
            const exists = prev.some((entry) => keyOf(entry) === key);
            if (exists) return prev.filter((entry) => keyOf(entry) !== key);
            if (prev.length >= MAX_COMPARE_ITEMS || item.type !== 'job') return prev;
            return [...prev, item];
        });
    };

    const clear = () => setSelections([]);

    const isSelected = (item: Announcement) => {
        const key = keyOf(item);
        if (!key) return false;
        return selections.some((entry) => keyOf(entry) === key);
    };

    const canAddMore = useMemo(() => selections.length < MAX_COMPARE_ITEMS, [selections.length]);

    return {
        selections,
        isOpen,
        maxItems: MAX_COMPARE_ITEMS,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        clear,
        add,
        remove,
        toggle,
        isSelected,
        canAddMore,
    };
}

export default useCompareV3;

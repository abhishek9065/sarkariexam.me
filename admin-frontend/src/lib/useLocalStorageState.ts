import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const isBrowser = typeof window !== 'undefined';

export function useLocalStorageState<T>(
    key: string,
    fallback: T,
    parse?: (raw: string) => T
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        if (!isBrowser) return fallback;
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        try {
            if (parse) return parse(raw);
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    });

    useEffect(() => {
        if (!isBrowser) return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Ignore storage write failures.
        }
    }, [key, value]);

    return [value, setValue];
}

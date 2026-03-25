function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

function isDevelopment(): boolean {
    const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return maybeProcess?.env?.['NODE_ENV'] === 'development';
}

export function trackEvent(event: string, data?: Record<string, unknown>): void {
    if (isDevelopment()) {
        console.debug('[analytics]', event, data ?? {});
    }
}

export function trackScrollDepth(page: string): () => void {
    if (!isBrowser()) return () => undefined;

    const reached = new Set<number>();
    const marks = [25, 50, 75, 100] as const;

    const onScroll = () => {
        const doc = document.documentElement;
        const height = doc.scrollHeight - doc.clientHeight;
        if (height <= 0) return;

        const percent = Math.round((window.scrollY / height) * 100);
        for (const mark of marks) {
            if (percent >= mark && !reached.has(mark)) {
                reached.add(mark);
                trackEvent('scroll_depth', { page, depth: mark });
            }
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
        window.removeEventListener('scroll', onScroll);
    };
}

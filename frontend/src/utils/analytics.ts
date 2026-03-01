/* ─── Client-Side Event Analytics ─── */

/**
 * Lightweight analytics tracker. Records events to an in-memory buffer
 * and flushes them to the backend every 10 seconds (or on page unload).
 *
 * The backend endpoint POST /api/analytics/events accepts an array of events.
 * If the endpoint doesn't exist yet, events silently fail — no user impact.
 */

interface AnalyticsEvent {
    name: string;
    props?: Record<string, string | number | boolean>;
    ts: number;
    path: string;
}

const FLUSH_INTERVAL = 10_000; // 10s
const MAX_BUFFER = 100;
const buffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getApiBase(): string {
    // Same base used by api.ts — avoid circular import
    return import.meta.env.VITE_API_BASE || '/api';
}

async function flushEvents() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, MAX_BUFFER);
    try {
        const res = await fetch(`${getApiBase()}/analytics/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batch }),
            keepalive: true, // Survives page unload
        });
        if (!res.ok && res.status !== 404) {
            // Re-queue on transient failure (but not 404)
            buffer.unshift(...batch);
        }
    } catch {
        // Network error — re-queue
        buffer.unshift(...batch);
        if (buffer.length > MAX_BUFFER * 2) buffer.length = MAX_BUFFER;
    }
}

function ensureFlushTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
    if (typeof window !== 'undefined') {
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushEvents();
        });
        window.addEventListener('pagehide', () => flushEvents());
    }
}

/**
 * Record a client analytics event.
 *
 * @param name  Event name (e.g. 'search_open', 'card_click', 'scroll_depth')
 * @param props Optional key-value metadata
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
    buffer.push({
        name,
        props,
        ts: Date.now(),
        path: typeof window !== 'undefined' ? window.location.pathname : '',
    });
    ensureFlushTimer();
}

/**
 * Track scroll depth — call once per page, will report 25/50/75/100% milestones.
 */
export function trackScrollDepth(pageName: string): (() => void) | undefined {
    if (typeof window === 'undefined') return undefined;
    const reported = new Set<number>();
    const milestones = [25, 50, 75, 100];

    const handler = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        const pct = Math.round((scrollTop / docHeight) * 100);

        for (const m of milestones) {
            if (pct >= m && !reported.has(m)) {
                reported.add(m);
                trackEvent('scroll_depth', { page: pageName, depth: m });
            }
        }
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
}

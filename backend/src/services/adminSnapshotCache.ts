import { config } from '../config.js';

type AdminSnapshotNamespace = 'dashboard' | 'manage-posts' | 'review-workspace' | 'ops-workspace';

type SnapshotEntry<T> = {
    expiresAt: number;
    value: T;
};

const snapshotCache = new Map<AdminSnapshotNamespace, Map<string, SnapshotEntry<unknown>>>();

const getNamespaceStore = (namespace: AdminSnapshotNamespace) => {
    const existing = snapshotCache.get(namespace);
    if (existing) return existing;
    const created = new Map<string, SnapshotEntry<unknown>>();
    snapshotCache.set(namespace, created);
    return created;
};

const cloneSnapshotValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function readAdminSnapshotCache<T>(namespace: AdminSnapshotNamespace, key: string): T | null {
    if (config.nodeEnv === 'test') return null;
    const store = getNamespaceStore(namespace);
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }
    return cloneSnapshotValue(entry.value as T);
}

export function writeAdminSnapshotCache<T>(
    namespace: AdminSnapshotNamespace,
    key: string,
    value: T,
    ttlMs: number,
): void {
    if (config.nodeEnv === 'test') return;
    const store = getNamespaceStore(namespace);
    store.set(key, {
        expiresAt: Date.now() + ttlMs,
        value: cloneSnapshotValue(value),
    });
}

export function invalidateAdminSnapshotNamespaces(namespaces: AdminSnapshotNamespace[]): void {
    for (const namespace of namespaces) {
        getNamespaceStore(namespace).clear();
    }
}

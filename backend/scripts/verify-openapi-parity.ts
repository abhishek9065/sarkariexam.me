import fs from 'fs';
import path from 'path';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const backendRoot = process.cwd();
const repoRoot = path.resolve(backendRoot, '..');
const serverPath = path.join(backendRoot, 'src', 'server.ts');
const openApiPath = path.join(repoRoot, 'openapi.json');

const ROUTER_FILE_BY_VAR: Record<string, string> = {
    adminSetupRouter: 'src/routes/admin-setup.ts',
    adminRouter: 'src/routes/admin.ts',
    analyticsRouter: 'src/routes/analytics.ts',
    announcementsRouter: 'src/routes/announcements.ts',
    authRouter: 'src/routes/auth.ts',
    bookmarksRouter: 'src/routes/bookmarks.ts',
    bulkRouter: 'src/routes/bulk.ts',
    communityRouter: 'src/routes/community.ts',
    graphqlRouter: 'src/routes/graphql.ts',
    jobsRouter: 'src/routes/jobs.ts',
    profileRouter: 'src/routes/profile.ts',
    pushRouter: 'src/routes/push.ts',
    subscriptionsRouter: 'src/routes/subscriptions.ts',
    supportRouter: 'src/routes/support.ts',
};

const METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

const normalizePath = (value: string): string => {
    if (!value || value === '/') return '/';
    const trimmed = value.trim();
    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const withoutTrailingSlash = withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
        ? withLeadingSlash.slice(0, -1)
        : withLeadingSlash;
    return withoutTrailingSlash.replace(/\/+/g, '/');
};

const toOpenApiPath = (value: string): string => normalizePath(value.replace(/:([A-Za-z0-9_]+)/g, '{$1}'));

const joinMountAndRoute = (mountPath: string, routePath: string): string => {
    if (routePath === '/' || routePath === '') return normalizePath(mountPath);
    return normalizePath(`${normalizePath(mountPath)}/${routePath}`);
};

const parseRouteMethods = (source: string): Array<{ method: HttpMethod; routePath: string }> => {
    const results: Array<{ method: HttpMethod; routePath: string }> = [];
    const regex = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
        const method = match[1] as HttpMethod;
        const routePath = match[2];
        if (routePath.includes('*')) continue;
        results.push({ method, routePath });
    }
    return results;
};

const parseServerMethods = (source: string): Array<{ method: HttpMethod; path: string }> => {
    const results: Array<{ method: HttpMethod; path: string }> = [];
    const regex = /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
        const method = match[1] as HttpMethod;
        const endpointPath = match[2];
        if (endpointPath.includes('*')) continue;
        results.push({ method, path: endpointPath });
    }
    return results;
};

const parseMountedRouters = (source: string): Array<{ mountPath: string; routerVar: string }> => {
    const results: Array<{ mountPath: string; routerVar: string }> = [];
    for (const line of source.split(/\r?\n/)) {
        if (!line.includes('app.use(')) continue;
        const mountMatch = line.match(/app\.use\(\s*['"`]([^'"`]+)['"`](.*)\);\s*$/);
        if (!mountMatch) continue;

        const mountPath = mountMatch[1];
        const tail = mountMatch[2] ?? '';
        const routerMatch = tail.match(/,\s*([A-Za-z0-9_]+)\s*$/);
        if (!routerMatch) continue;

        results.push({
            mountPath,
            routerVar: routerMatch[1],
        });
    }
    return results;
};

const toMethodPathKey = (method: string, endpointPath: string) => `${method.toUpperCase()} ${toOpenApiPath(endpointPath)}`;

const serverSource = fs.readFileSync(serverPath, 'utf8');
const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf8')) as {
    paths?: Record<string, Partial<Record<HttpMethod, unknown>>>;
};

const implemented = new Set<string>();
const mountedRouters = parseMountedRouters(serverSource);
for (const mount of mountedRouters) {
    const routeFile = ROUTER_FILE_BY_VAR[mount.routerVar];
    if (!routeFile) continue;

    const routeFilePath = path.join(backendRoot, routeFile);
    if (!fs.existsSync(routeFilePath)) continue;

    const routeSource = fs.readFileSync(routeFilePath, 'utf8');
    const methods = parseRouteMethods(routeSource);
    for (const entry of methods) {
        const fullPath = joinMountAndRoute(mount.mountPath, entry.routePath);
        implemented.add(toMethodPathKey(entry.method, fullPath));
    }
}

for (const entry of parseServerMethods(serverSource)) {
    implemented.add(toMethodPathKey(entry.method, entry.path));
}

const documented = new Set<string>();
for (const [rawPath, methods] of Object.entries(openApi.paths ?? {})) {
    const normalizedPath = toOpenApiPath(rawPath);
    for (const method of METHODS) {
        if (!methods?.[method]) continue;
        documented.add(toMethodPathKey(method, normalizedPath));
    }
}

const implementedNotDocumented = Array.from(implemented).filter((key) => !documented.has(key)).sort();
const documentedNotImplemented = Array.from(documented).filter((key) => !implemented.has(key)).sort();

if (implementedNotDocumented.length === 0 && documentedNotImplemented.length === 0) {
    console.log(`[openapi-parity] OK. Implemented and documented endpoints are in sync (${implemented.size} method-path entries).`);
    process.exit(0);
}

console.error(`[openapi-parity] Mismatch detected.`);
if (implementedNotDocumented.length > 0) {
    console.error(`\nImplemented but missing in openapi.json (${implementedNotDocumented.length}):`);
    for (const key of implementedNotDocumented) {
        console.error(`  - ${key}`);
    }
}

if (documentedNotImplemented.length > 0) {
    console.error(`\nDocumented in openapi.json but not implemented (${documentedNotImplemented.length}):`);
    for (const key of documentedNotImplemented) {
        console.error(`  - ${key}`);
    }
}

process.exit(1);

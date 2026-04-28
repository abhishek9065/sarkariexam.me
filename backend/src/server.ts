import fs from 'fs';
import http from 'http';
import path from 'path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import csurf from 'csurf';
import express from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config.js';
import { cloudflareMiddleware } from './middleware/cloudflare.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit as distributedRateLimit } from './middleware/rateLimit.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { correlationIdMiddleware, requestMetricsMiddleware } from './middleware/requestTracking.js';
import { responseTimeLogger } from './middleware/responseTime.js';
import {
  securityHeaders,
  blockSuspiciousAgents,
  validateContentType,
} from './middleware/security.js';
import adminRouter from './routes/admin.js';
import announcementsRouter from './routes/announcements.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import communityRouter from './routes/community.js';
import contentRouter from './routes/content.js';
import editorialRouter from './routes/editorial.js';
import jobsRouter from './routes/jobs.js';
import profileRouter from './routes/profile.js';
import pushRouter from './routes/push.js';
import subscriptionsRouter from './routes/subscriptions.js';
import supportRouter from './routes/support.js';
import { scheduleAnalyticsRollups } from './services/analytics.js';
import { scheduleAutomationJobs } from './services/automationJobs.js';
import {
  connectToDatabase,
  ensureDatabaseReady,
  healthCheck,
  isDatabaseConfigured,
} from './services/cosmosdb.js';
import { scheduleDigestSender } from './services/digestScheduler.js';
import { ErrorTracking } from './services/errorTracking.js';
import { getLegacyRuntimeDiagnostics, legacyMongoBackedApiPrefixes, startLegacyMongoRuntime } from './services/legacyRuntime.js';
import { postgresHealthCheck } from './services/postgres/prisma.js';
import { scheduleSavedSearchAlerts } from './services/savedSearchAlerts.js';
import { getSecurityMetricSnapshot } from './services/securityMetrics.js';
import { scheduleTrackerReminders } from './services/trackerReminders.js';
import logger from './utils/logger.js';

const app = express();
const startedAt = Date.now();

type PostgresReadinessSnapshot = {
  checkedAt: number;
  ok: boolean;
};

let postgresReadinessSnapshot: PostgresReadinessSnapshot | null = null;
let postgresReadinessInFlight: Promise<boolean> | null = null;
let postgresGuardFailureActive = false;
let postgresGuardLastFailureLogAt = 0;

export { app };

// Trust proxy only for local/private networks where the edge proxy runs.
const isTrustedProxyIp = (value: string) => {
  const normalized = value.trim().replace(/^::ffff:/, '');
  if (!normalized) return false;
  if (normalized === '127.0.0.1' || normalized === '::1') return true;
  if (normalized.startsWith('10.')) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  return normalized.startsWith('fc') || normalized.startsWith('fd');
};
app.set('trust proxy', (ip) => isTrustedProxyIp(ip));
app.disable('x-powered-by');

const proxyGuardExemptApiPaths = new Set(['/health', '/healthz', '/livez', '/readyz', '/health/deep']);
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const enforceTrustedProxy = config.isProduction || process.env.ENFORCE_TRUSTED_PROXY === 'true';
const requireOriginForMutatingApi = config.isProduction || process.env.ENFORCE_API_ORIGIN === 'true';

// ============ SECURITY MIDDLEWARE ============
app.use(correlationIdMiddleware);
app.use(requestMetricsMiddleware);
app.use(requestIdMiddleware);
app.use(cloudflareMiddleware());
app.use(securityHeaders);
app.use(blockSuspiciousAgents);

// Compression
app.use(compression());

// CORS configuration
const normalizeOrigin = (value: string) => value.trim().toLowerCase().replace(/\/$/, '');
const allowedOrigins = [
  ...config.corsOrigins,
  config.frontendUrl,
]
  .filter(Boolean)
  .map((origin) => normalizeOrigin(origin as string));
const allowedOriginSet = new Set(allowedOrigins);
const isAllowedOrigin = (origin: string) => {
  const normalized = normalizeOrigin(origin);
  return allowedOriginSet.has(normalized);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, '[CORS] Blocked request');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-XSRF-Token',
    'Idempotency-Key',
  ]
}));

// Rate limiting
app.use('/api', expressRateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));
app.use('/api/auth', expressRateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));
app.use('/api', distributedRateLimit({ windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitMax, keyPrefix: 'api' }));
app.use('/api/auth', distributedRateLimit({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.authRateLimitMax,
  keyPrefix: 'auth',
  requireDistributedStore: config.isProduction,
}));

// Body parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);

app.use('/api', (req, res, next) => {
  if (enforceTrustedProxy && !proxyGuardExemptApiPaths.has(req.path)) {
    const upstreamIp = (req.socket.remoteAddress ?? '').trim().replace(/^::ffff:/, '');
    if (!isTrustedProxyIp(upstreamIp)) {
      logger.warn({ path: req.path, upstreamIp }, '[Network] Blocked direct API access outside trusted proxy');
      res.status(403).json({
        error: 'Proxy required',
        code: 'PROXY_REQUIRED',
        message: 'API access must come through a trusted reverse proxy.',
        requestId: req.requestId,
      });
      return;
    }
  }

  const isMutating = mutatingMethods.has(req.method.toUpperCase());
  if (!isMutating) {
    next();
    return;
  }

  if (!requireOriginForMutatingApi) {
    next();
    return;
  }

  const origin = req.get('origin');
  const hasBearerToken = /^Bearer\s+/i.test(req.get('authorization') ?? '');
  if (!origin && !hasBearerToken) {
    logger.warn({ path: req.path }, '[CORS] Missing origin on mutating request');
    res.status(403).json({
      error: 'Origin header required',
      code: 'ORIGIN_REQUIRED',
      message: 'Origin header is required for browser-style state-changing requests.',
      requestId: req.requestId,
    });
    return;
  }

  next();
});

const apiCsrfProtection = csurf({
  cookie: {
    key: '_csrf',
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  },
  value: (req) => {
    const headerToken = req.get('x-csrf-token') ?? req.get('x-xsrf-token');
    if (headerToken) return headerToken;

    const body = req.body as Record<string, unknown> | undefined;
    if (body && typeof body._csrf === 'string') return body._csrf;
    if (body && typeof body.csrfToken === 'string') return body.csrfToken;
    return '';
  },
});

app.use('/api', apiCsrfProtection);

// Swagger UI
try {
  if (!config.isProduction) {
    const openApiCandidates = [
      path.join(process.cwd(), 'openapi.json'),
      path.join(process.cwd(), '../openapi.json'),
    ];
    const openApiPath = openApiCandidates.find((candidate) => fs.existsSync(candidate));
    if (openApiPath) {
      const openApiParams = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiParams));
      logger.info('[Server] Swagger UI available at /api/docs');
    } else {
      logger.warn('[Server] openapi.json not found, skipping Swagger UI');
    }
  } else {
    logger.info('[Server] Swagger UI disabled in production');
  }
} catch (err) {
  logger.error({ err }, '[Server] Failed to load Swagger UI');
}

// Response time logging
app.use(responseTimeLogger);

// Health check
app.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    service: 'SarkariExams API',
    status: 'running',
  });
});

app.get('/api/health', distributedRateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'health' }), async (_req, res) => {
  return buildHealthResponse(res);
});

app.get('/api/healthz', distributedRateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'health' }), async (_req, res) => {
  return buildHealthResponse(res);
});

app.get('/api/livez', distributedRateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'health-live' }), (_req, res) => {
  res
    .status(200)
    .set('Cache-Control', 'no-store')
    .json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
});

app.get('/api/readyz', distributedRateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'health-ready' }), async (_req, res) => {
  const readiness = await buildReadinessPayload();
  res
    .status(readiness.status === 'error' ? 503 : 200)
    .set('Cache-Control', 'no-store')
    .json(readiness);
});

app.get('/api/health/deep', distributedRateLimit({ windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'health-deep' }), async (_req, res) => {
  const readiness = await buildReadinessPayload();

  res
    .status(readiness.status === 'error' ? 503 : 200)
    .set('Cache-Control', 'no-store')
    .json({
      ...readiness,
      runtime: buildRuntimeDiagnostics(),
    });
});

// Transitional safety boundary for any route prefixes that still require the legacy bridge.
function isLegacyMongoGuardedApi(pathname: string): boolean {
  return legacyMongoBackedApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildLegacyBridgeHealth(dbConfigured: boolean, dbOk: boolean | null, checked: boolean) {
  if (!dbConfigured) {
    return {
      configured: false,
      required: config.legacyMongoRequired,
      status: 'not_configured' as const,
    };
  }

  if (!checked) {
    return {
      configured: true,
      required: false,
      status: 'not_required' as const,
    };
  }

  const ok = dbOk === true;

  return {
    configured: true,
    required: true,
    ok,
    status: ok ? ('ok' as const) : ('degraded' as const),
  };
}

function buildPostgresReadinessCacheDiagnostics() {
  if (!postgresReadinessSnapshot) {
    return {
      cached: false,
      ttlMs: config.readinessCacheTtlMs,
    };
  }

  const ageMs = Math.max(0, Date.now() - postgresReadinessSnapshot.checkedAt);
  return {
    cached: true,
    ttlMs: config.readinessCacheTtlMs,
    ageMs,
    fresh: ageMs <= config.readinessCacheTtlMs,
    lastCheckedAt: new Date(postgresReadinessSnapshot.checkedAt).toISOString(),
    lastResult: postgresReadinessSnapshot.ok,
  };
}

function logPostgresGuardUnavailable(pathname: string) {
  const now = Date.now();
  const throttleMs = Math.max(250, config.readinessCacheTtlMs);
  const shouldLog = !postgresGuardFailureActive || (now - postgresGuardLastFailureLogAt) >= throttleMs;

  postgresGuardFailureActive = true;
  if (!shouldLog) {
    return;
  }

  postgresGuardLastFailureLogAt = now;
  logger.error(
    {
      path: pathname,
      postgresConfigured: Boolean(config.postgresPrismaUrl),
      readinessCache: buildPostgresReadinessCacheDiagnostics(),
    },
    '[Server] PostgreSQL primary database unavailable',
  );
}

function logPostgresGuardRecovered() {
  if (!postgresGuardFailureActive) {
    return;
  }

  postgresGuardFailureActive = false;
  logger.info(
    {
      readinessCache: buildPostgresReadinessCacheDiagnostics(),
    },
    '[Server] PostgreSQL primary database recovered',
  );
}

async function getPostgresReadinessCached(): Promise<boolean> {
  if (!config.postgresPrismaUrl) {
    return false;
  }

  const now = Date.now();

  if (
    postgresReadinessSnapshot
    && (now - postgresReadinessSnapshot.checkedAt) <= config.readinessCacheTtlMs
  ) {
    return postgresReadinessSnapshot.ok;
  }

  if (postgresReadinessInFlight) {
    return postgresReadinessInFlight;
  }

  postgresReadinessInFlight = postgresHealthCheck()
    .then((ok) => {
      postgresReadinessSnapshot = {
        checkedAt: Date.now(),
        ok,
      };
      return ok;
    })
    .catch((error) => {
      logger.error({ err: error }, '[Server] Postgres readiness probe threw an unexpected error');
      postgresReadinessSnapshot = {
        checkedAt: Date.now(),
        ok: false,
      };
      return false;
    })
    .finally(() => {
      postgresReadinessInFlight = null;
    });

  return postgresReadinessInFlight;
}

async function buildReadinessPayload() {
  const dbConfigured = isDatabaseConfigured();
  const shouldCheckLegacyBridge = dbConfigured && config.legacyMongoRequired;
  const dbOk = shouldCheckLegacyBridge ? await healthCheck() : null;
  const postgresConfigured = Boolean(config.postgresPrismaUrl);
  const postgresOk = postgresConfigured ? await getPostgresReadinessCached() : null;
  const legacyBridge = buildLegacyBridgeHealth(dbConfigured, dbOk, shouldCheckLegacyBridge);
  const hasPostgresFailure = !postgresConfigured || postgresOk === false;
  const status = hasPostgresFailure ? 'error' : 'ok';

  return {
    status,
    timestamp: new Date().toISOString(),
    db: legacyBridge,
    legacyBridge,
    contentDb: {
      postgres: {
        configured: postgresConfigured,
        ok: postgresOk,
        readinessCache: buildPostgresReadinessCacheDiagnostics(),
      },
    },
  };
}

function buildRuntimeDiagnostics() {
  return {
    legacyMongo: getLegacyRuntimeDiagnostics(config.legacyMongoConfigured),
    postgres: {
      configured: Boolean(config.postgresPrismaUrl),
      readinessCache: buildPostgresReadinessCacheDiagnostics(),
    },
    readiness: {
      cacheTtlMs: config.readinessCacheTtlMs,
    },
    frontendRevalidation: {
      configured: config.frontendRevalidationConfigured,
      urlConfigured: Boolean(config.frontendRevalidateUrl),
      tokenConfigured: Boolean(config.frontendRevalidateToken),
    },
    metrics: {
      enabled: Boolean(config.metricsToken),
    },
    warnings: config.runtimeWarnings,
  };
}

async function buildHealthResponse(res: express.Response) {
  const readiness = await buildReadinessPayload();

  return res
    .status(readiness.status === 'error' ? 503 : 200)
    .set('Cache-Control', 'no-store')
    .json({
      ...readiness,
      runtime: buildRuntimeDiagnostics(),
    });
}

app.get('/metrics', (req, res) => {
  const token = config.metricsToken;
  if (config.isProduction && !token) {
    res.status(404).type('text/plain').send('not found');
    return;
  }
  const providedToken = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || req.get('X-Metrics-Token');
  if (token && token !== providedToken) {
    res.status(401).type('text/plain').send('unauthorized');
    return;
  }

  const uptimeSeconds = (Date.now() - startedAt) / 1000;
  const memory = process.memoryUsage();
  const dbConfigured = Boolean(process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI);
  const postgresConfigured = Boolean(config.postgresPrismaUrl);
  const securityMetrics = getSecurityMetricSnapshot();

  const lines = [
    '# HELP app_uptime_seconds App uptime in seconds',
    '# TYPE app_uptime_seconds gauge',
    `app_uptime_seconds ${uptimeSeconds.toFixed(0)}`,
    '# HELP process_resident_memory_bytes Resident memory size in bytes',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${memory.rss}`,
    '# HELP process_heap_total_bytes Process heap total in bytes',
    '# TYPE process_heap_total_bytes gauge',
    `process_heap_total_bytes ${memory.heapTotal}`,
    '# HELP process_heap_used_bytes Process heap used in bytes',
    '# TYPE process_heap_used_bytes gauge',
    `process_heap_used_bytes ${memory.heapUsed}`,
    '# HELP process_external_memory_bytes Process external memory in bytes',
    '# TYPE process_external_memory_bytes gauge',
    `process_external_memory_bytes ${memory.external}`,
    '# HELP app_db_configured Database configured (1=yes, 0=no)',
    '# TYPE app_db_configured gauge',
    `app_db_configured ${dbConfigured ? 1 : 0}`,
    '# HELP app_postgres_configured PostgreSQL configured for Prisma (1=yes, 0=no)',
    '# TYPE app_postgres_configured gauge',
    `app_postgres_configured ${postgresConfigured ? 1 : 0}`,
    '# HELP app_build_info Build information',
    '# TYPE app_build_info gauge',
    `app_build_info{node_version="${process.version}"} 1`,
    '# HELP app_security_rate_limit_triggers_total Total requests blocked by rate-limiting middleware',
    '# TYPE app_security_rate_limit_triggers_total counter',
    `app_security_rate_limit_triggers_total ${securityMetrics.rateLimitTriggers}`,
    '# HELP app_security_auth_login_failures_total Total failed login attempts',
    '# TYPE app_security_auth_login_failures_total counter',
    `app_security_auth_login_failures_total ${securityMetrics.authLoginFailures}`,
    '# HELP app_security_bruteforce_blocked_responses_total Total login responses blocked due to brute-force state',
    '# TYPE app_security_bruteforce_blocked_responses_total counter',
    `app_security_bruteforce_blocked_responses_total ${securityMetrics.bruteForceBlockedResponses}`
  ];

  res.set('Cache-Control', 'no-store');
  res.type('text/plain; version=0.0.4').send(`${lines.join('\n')}\n`);
});

app.use(async (req, res, next) => {
  if (config.nodeEnv === 'test') {
    next();
    return;
  }

  // PostgreSQL is the primary runtime dependency for API request handling.
  const isPostgresOk = await getPostgresReadinessCached();
  if (!isPostgresOk) {
    logPostgresGuardUnavailable(req.path);
    return res.status(503).json({
      error: 'Service unavailable',
      code: 'PRIMARY_DB_UNAVAILABLE',
      message: 'Primary content database is temporarily unavailable. Please retry shortly.',
      requestId: req.requestId,
    });
  }

  logPostgresGuardRecovered();

  // Legacy Mongo/Cosmos compatibility guardrail for transitional prefixes only.
  if (isLegacyMongoGuardedApi(req.path)) {
    if (!isDatabaseConfigured()) {
      logger.warn({ path: req.path }, '[Server] Legacy Mongo database not configured for guarded compatibility route');
      return res.status(503).json({
        error: 'Service unavailable',
        code: 'LEGACY_DB_UNAVAILABLE',
        message: 'Legacy database is not configured for this compatibility route.',
        requestId: req.requestId,
      });
    }

    try {
      await ensureDatabaseReady();
    } catch (error) {
      logger.error({ err: error, path: req.path }, '[Server] Legacy Mongo database unavailable');
      return res.status(503).json({
        error: 'Service unavailable',
        code: 'LEGACY_DB_UNAVAILABLE',
        message: 'Legacy database is temporarily unavailable. Please retry shortly.',
        requestId: req.requestId,
      });
    }
  }

  next();
});

// API routes.
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/content', contentRouter);
app.use('/api/editorial', editorialRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/push', pushRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/community', communityRouter);
app.use('/api/support', supportRouter);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    message: 'The requested API endpoint does not exist.',
    requestId: req.requestId,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startPostgresPrimaryRuntime() {
  if (!config.postgresPrismaUrl) {
    logger.info('[Server] Postgres primary schedulers disabled because PostgreSQL is not configured');
    return;
  }

  await scheduleAnalyticsRollups().catch((error) => {
    logger.error({ err: error }, '[Server] Analytics rollup scheduler init failed');
  });

  try {
    scheduleAutomationJobs();
  } catch (error) {
    logger.error({ err: error }, '[Server] Automation scheduler init failed');
  }

  scheduleDigestSender();
  scheduleSavedSearchAlerts();
  scheduleTrackerReminders();

  logger.info('[Server] Postgres primary runtime schedulers started');
}

export async function startServer() {
  ErrorTracking.init();
  for (const warning of config.runtimeWarnings) {
    logger.warn({ warning }, '[Server] Runtime configuration warning');
  }

  try {
    if (isDatabaseConfigured()) {
      await connectToDatabase();
      logger.info('[Server] Legacy Mongo/Cosmos bridge connected successfully');
      await startLegacyMongoRuntime({
        logger,
      });
    } else {
      logger.info(
        { guardedApiPrefixes: legacyMongoBackedApiPrefixes },
        '[Server] Legacy Mongo/Cosmos bridge not configured; compatibility-only bridge features remain unavailable',
      );
    }
  } catch (error) {
    logger.error({ err: error }, '[Server] Legacy Mongo/Cosmos bridge connection failed');
    if (config.isProduction && config.legacyMongoRequired) {
      throw error;
    }
    logger.info('[Server] Starting without Mongo/Cosmos bridge; compatibility-only bridge features will be degraded');
  }

  await startPostgresPrimaryRuntime();

  const server = http.createServer(app);

  return new Promise<http.Server>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, () => {
      logger.info(`API running on http://localhost:${config.port}`);
      resolve(server);
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.fatal({ err: error }, '[Server] Startup failed');
    process.exit(1);
  });
}

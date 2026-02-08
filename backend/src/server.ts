import fs from 'fs';
import http from 'http';
import path from 'path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { config } from './config.js';
import { authenticateToken, requirePermission } from './middleware/auth.js';
import { cloudflareMiddleware } from './middleware/cloudflare.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { responseTimeLogger, getPerformanceStats } from './middleware/responseTime.js';
import {
  securityHeaders,
  blockSuspiciousAgents,
  sanitizeRequestBody,
  validateContentType,
  enforceAdminHttps,
  enforceAdminIpAllowlist
} from './middleware/security.js';
import adminSetupRouter from './routes/admin-setup.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import announcementsRouter from './routes/announcements.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import bulkRouter from './routes/bulk.js';
import communityRouter from './routes/community.js';
import graphqlRouter from './routes/graphql.js';
import jobsRouter from './routes/jobs.js';
import profileRouter from './routes/profile.js';
import pushRouter from './routes/push.js';
import subscriptionsRouter from './routes/subscriptions.js';
import supportRouter from './routes/support.js';
import { scheduleAnalyticsRollups } from './services/analytics.js';
import { startAnalyticsWebSocket } from './services/analyticsStream.js';
import { scheduleAdminApprovalsCleanup } from './services/adminApprovals.js';
import { connectToDatabase, healthCheck } from './services/cosmosdb.js';
import { ErrorTracking } from './services/errorTracking.js';
import logger from './utils/logger.js';

const app = express();
const startedAt = Date.now();

export { app };

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// ============ SECURITY MIDDLEWARE ============
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
const allowedOriginHosts = new Set(
  allowedOrigins
    .map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return null;
      }
    })
    .filter((host): host is string => Boolean(host))
);
const isAllowedOrigin = (origin: string) => {
  const normalized = normalizeOrigin(origin);
  if (allowedOriginSet.has(normalized)) return true;
  try {
    const hostname = new URL(normalized).hostname;
    if (allowedOriginHosts.has(hostname)) return true;
    if (hostname.endsWith('.sarkariexams.me')) return true;
  } catch {
    // ignore invalid origin
  }
  return false;
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
    'X-Admin-Step-Up-Token',
    'X-Admin-Approval-Id',
    'Idempotency-Key',
  ]
}));

// Body parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);
app.use(sanitizeRequestBody);

// Swagger UI
try {
  const openApiPath = path.join(process.cwd(), '../openapi.json');
  if (fs.existsSync(openApiPath)) {
    const openApiParams = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiParams));
    logger.info('[Server] Swagger UI available at /api/docs');
  } else {
    logger.warn('[Server] openapi.json not found, skipping Swagger UI');
  }
} catch (err) {
  logger.error({ err }, '[Server] Failed to load Swagger UI');
}

// Rate limiting
app.use('/api', rateLimit({ windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitMax }));
app.use('/api/auth', rateLimit({ windowMs: config.rateLimitWindowMs, maxRequests: config.authRateLimitMax }));
app.use(
  ['/api/admin', '/api/analytics', '/api/graphql', '/api/bulk', '/api/performance'],
  enforceAdminHttps,
  enforceAdminIpAllowlist,
  rateLimit({ windowMs: config.rateLimitWindowMs, maxRequests: config.adminRateLimitMax, keyPrefix: 'admin' })
);

// Response time logging
app.use(responseTimeLogger);

// Health check
app.get('/', (_req, res) => {
  res.json({
    service: 'SarkariExams API',
    status: 'running',
    version: '2.0.0'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/deep', async (_req, res) => {
  const dbConfigured = Boolean(process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI);
  const dbOk = dbConfigured ? await healthCheck() : null;
  const status = dbConfigured && !dbOk ? 'error' : 'ok';

  res
    .status(status === 'error' ? 503 : 200)
    .set('Cache-Control', 'no-store')
    .json({
      status,
      timestamp: new Date().toISOString(),
      db: dbConfigured ? { configured: true, ok: dbOk } : { configured: false, status: 'not_configured' }
    });
});

app.get('/metrics', (req, res) => {
  const token = process.env.METRICS_TOKEN;
  const providedToken = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || req.get('X-Metrics-Token');
  if (token && token !== providedToken) {
    res.status(401).type('text/plain').send('unauthorized');
    return;
  }

  const uptimeSeconds = (Date.now() - startedAt) / 1000;
  const memory = process.memoryUsage();
  const dbConfigured = Boolean(process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI);

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
    '# HELP app_build_info Build information',
    '# TYPE app_build_info gauge',
    `app_build_info{node_version="${process.version}"} 1`
  ];

  res.set('Cache-Control', 'no-store');
  res.type('text/plain; version=0.0.4').send(`${lines.join('\n')}\n`);
});

// Performance stats (admin only)
app.get('/api/performance', authenticateToken, requirePermission('admin:read'), (_req, res) => {
  res.json({ data: getPerformanceStats() });
});

// Core Routes (MongoDB-based)
app.use('/api/auth', authRouter);
app.use('/api/auth/admin', adminSetupRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/graphql', graphqlRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/push', pushRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/bulk', bulkRouter);
app.use('/api/community', communityRouter);
app.use('/api/support', supportRouter);

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested API endpoint does not exist.'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
export async function startServer() {
  try {
    ErrorTracking.init();
    
    if (process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI) {
      await connectToDatabase();
      logger.info('[Server] MongoDB connected successfully');
      await scheduleAnalyticsRollups().catch(error => {
        logger.error({ err: error }, '[Analytics] Rollup init failed');
      });
      scheduleAdminApprovalsCleanup();
    } else {
      logger.info('[Server] No MongoDB configured, using fallback data');
    }
  } catch (error) {
    logger.error({ err: error }, '[Server] Database connection failed');
    logger.info('[Server] Starting without database - using fallback data');
  }

  const server = http.createServer(app);
  startAnalyticsWebSocket(server);

  server.listen(config.port, () => {
    logger.info(`API running on http://localhost:${config.port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

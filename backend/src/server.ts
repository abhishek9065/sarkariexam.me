import http from 'http';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';


import { config } from './config.js';
import { authenticateToken, requirePermission } from './middleware/auth.js';
import { cloudflareMiddleware } from './middleware/cloudflare.js';
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
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import announcementsRouter from './routes/announcements.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import bulkRouter from './routes/bulk.js';
import graphqlRouter from './routes/graphql.js';
import jobsRouter from './routes/jobs.js';
import profileRouter from './routes/profile.js';
import pushRouter from './routes/push.js';
import subscriptionsRouter from './routes/subscriptions.js';
import { scheduleAnalyticsRollups } from './services/analytics.js';
import { startAnalyticsWebSocket } from './services/analyticsStream.js';
import { connectToDatabase } from './services/cosmosdb.js';
import { ErrorTracking } from './services/errorTracking.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

export { app };

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// ============ SECURITY MIDDLEWARE ============
app.use(cloudflareMiddleware());
app.use(securityHeaders);
app.use(blockSuspiciousAgents);

// CORS configuration
const allowedOrigins = config.corsOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, '[CORS] Blocked request');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);
app.use(sanitizeRequestBody);

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

// Performance stats (admin only)
app.get('/api/performance', authenticateToken, requirePermission('admin:read'), (_req, res) => {
  res.json({ data: getPerformanceStats() });
});

// Core Routes (MongoDB-based)
app.use('/api/auth', authRouter);
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

// Global Error Handler
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
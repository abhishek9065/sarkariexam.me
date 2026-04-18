import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';


/**
 * Parse comma-separated values.
 */
const parseCsv = (value?: string): string[] => {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Parse number with fallback.
 */
const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Parse boolean with fallback.
 */
const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

/**
 * Get required environment variable (no fallback allowed in production).
 */
const getRequiredEnv = (key: string, devFallback?: string): string => {
  const value = process.env[key];

  if (!value) {
    if (isProduction) {
      throw new Error(`SECURITY ERROR: Missing required env var "${key}" in production.`);
    }
    if (devFallback) {
      console.warn(`[CONFIG] Warning: Using default value for ${key} (development only)`);
      return devFallback;
    }
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
};

/**
 * Validate that a secret is not using insecure default values in production.
 */
const validateSecret = (key: string, value: string, insecureDefaults: string[]): void => {
  if (isProduction && insecureDefaults.includes(value)) {
    throw new Error(`SECURITY ERROR: "${key}" is using an insecure default value in production.`);
  }
};

// Legacy Mongo/Cosmos bridge configuration.
// New core runtime dependencies should not be added here; PostgreSQL is the primary domain runtime.
const getDbConnectionString = (): string => {
  const mongoUrl = process.env.MONGODB_URI;
  const cosmosUrl = process.env.COSMOS_CONNECTION_STRING;

  // In tests, prefer explicit test Mongo URI to avoid .env collisions.
  if (process.env.NODE_ENV === 'test' && mongoUrl) {
    return mongoUrl;
  }

  // Prefer explicit Mongo URI first when provided, then Cosmos connection.
  if (mongoUrl) return mongoUrl;
  if (cosmosUrl) return cosmosUrl;

  // In production, require MongoDB connection
  if (isProduction) {
    throw new Error('SECURITY ERROR: No database configured. Set COSMOS_CONNECTION_STRING or MONGODB_URI.');
  }

  // Dev fallback - use local MongoDB
  console.warn('[CONFIG] Warning: No MongoDB configured (development mode)');
  return 'mongodb://localhost:27017/sarkari_db';
};

const databaseUrl = getDbConnectionString();
const jwtSecret = getRequiredEnv('JWT_SECRET', isTest ? 'test-secret' : undefined);

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://sarkariexams.me',
  'https://www.sarkariexams.me'
];

const corsOrigins = parseCsv(process.env.CORS_ORIGINS);
const rateLimitWindowMs = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000);
const rateLimitMax = parseNumber(process.env.RATE_LIMIT_MAX, 200);
const authRateLimitMax = parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 20);
const jwtIssuer = process.env.JWT_ISSUER ?? '';
const jwtAudience = process.env.JWT_AUDIENCE ?? '';
const jwtExpiry = process.env.JWT_EXPIRY ?? '1d';
const passwordHistoryLimit = Math.max(1, parseNumber(process.env.PASSWORD_HISTORY_LIMIT, 5));
const passwordBreachCheckEnabled = parseBoolean(process.env.PASSWORD_BREACH_CHECK_ENABLED, true);
const passwordBreachCheckTimeoutMs = Math.max(500, parseNumber(process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS, 2500));
const metricsToken = process.env.METRICS_TOKEN ?? '';
const securityLogRetentionHours = Math.max(1, parseNumber(process.env.SECURITY_LOG_RETENTION_HOURS, 24));
const securityLogPersistenceEnabled = parseBoolean(process.env.SECURITY_LOG_PERSISTENCE_ENABLED, true);
const securityLogDbRetentionDays = Math.max(1, parseNumber(process.env.SECURITY_LOG_DB_RETENTION_DAYS, 30));
const securityLogCleanupIntervalMinutes = Math.max(5, parseNumber(process.env.SECURITY_LOG_CLEANUP_INTERVAL_MINUTES, 60));
const configuredContentDbMode = (process.env.CONTENT_DB_MODE ?? 'postgres').toLowerCase();
const contentDbMode = 'postgres';
const postgresPrismaUrl = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? '';
const postgresDirectUrl = process.env.POSTGRES_DIRECT_URL ?? process.env.DIRECT_URL ?? '';
const legacyMongoConfigured = Boolean(process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI);
const frontendRevalidationConfigured = Boolean(process.env.FRONTEND_REVALIDATE_URL && process.env.FRONTEND_REVALIDATE_TOKEN);
const featureFlags = {
  search_overlay_v2: parseBoolean(process.env.FEATURE_SEARCH_OVERLAY_V2, true),
  compare_jobs_v2: parseBoolean(process.env.FEATURE_COMPARE_JOBS_V2, true),
  tracker_api_v2: parseBoolean(process.env.FEATURE_TRACKER_API_V2, true),
  dashboard_widgets_v2: parseBoolean(process.env.FEATURE_DASHBOARD_WIDGETS_V2, true),
};

// Validate secrets aren't using known insecure defaults in production
validateSecret('JWT_SECRET', jwtSecret, ['dev-secret', 'test-secret', 'change-me', 'secret', 'jwt-secret']);

const runtimeWarnings: string[] = [];

if (!postgresPrismaUrl) {
  runtimeWarnings.push('POSTGRES_PRISMA_URL (or DATABASE_URL) is missing; primary content and editorial APIs will be unhealthy.');
}

if (!legacyMongoConfigured) {
  runtimeWarnings.push('Mongo/Cosmos legacy bridge is not configured; remaining legacy compatibility routes and schedulers stay unavailable.');
}

if (process.env.FRONTEND_REVALIDATE_URL && !process.env.FRONTEND_REVALIDATE_TOKEN) {
  runtimeWarnings.push('FRONTEND_REVALIDATE_URL is set without FRONTEND_REVALIDATE_TOKEN; publish-triggered frontend revalidation is disabled.');
}

if (isProduction && !metricsToken) {
  runtimeWarnings.push('METRICS_TOKEN is not set in production; /metrics is disabled.');
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl,
  jwtSecret,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : defaultCorsOrigins,
  rateLimitWindowMs,
  rateLimitMax,
  authRateLimitMax,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  jwtIssuer,
  jwtAudience,
  jwtExpiry,
  passwordHistoryLimit,
  passwordBreachCheckEnabled,
  passwordBreachCheckTimeoutMs,
  metricsToken,
  securityLogRetentionHours,
  securityLogPersistenceEnabled,
  securityLogDbRetentionDays,
  securityLogCleanupIntervalMinutes,
  contentDbMode,
  postgresPrismaUrl,
  postgresDirectUrl,
  legacyMongoConfigured,
  frontendRevalidationConfigured,
  runtimeWarnings,
  featureFlags,

  // Cosmos DB specific
  cosmosDbName: process.env.COSMOS_DATABASE_NAME || 'sarkari_db',

  // Telegram bot config (optional)
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID ?? '',

  // SendGrid email config (optional)
  emailUser: process.env.EMAIL_USER ?? '',
  emailPass: process.env.SENDGRID_API_KEY ?? process.env.EMAIL_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Sarkari Result <noreply@sarkariresult.com>',

  // Frontend URL for links in emails
  frontendUrl: process.env.FRONTEND_URL ?? 'https://sarkariexams.me',
  frontendRevalidateUrl: process.env.FRONTEND_REVALIDATE_URL ?? '',
  frontendRevalidateToken: process.env.FRONTEND_REVALIDATE_TOKEN ?? '',

  // VAPID keys for web push notifications (optional)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
};

// Log configuration status on startup (without exposing secrets)
if (!isProduction) {
  console.log('[CONFIG] Running in development mode');
  console.log(`[CONFIG] Primary Content DB: PostgreSQL (Neon compatible)`);
  console.log(`[CONFIG] Legacy database bridge: ${legacyMongoConfigured ? (databaseUrl.includes('localhost') ? 'local MongoDB' : 'Cosmos DB') : 'not configured'}`);
  if (configuredContentDbMode !== 'postgres') {
    console.log(`[CONFIG] CONTENT_DB_MODE=${configuredContentDbMode} ignored; forcing postgres mode`);
  }
  console.log(`[CONFIG] PostgreSQL URLs: Prisma=${postgresPrismaUrl ? 'yes' : 'no'}, Direct=${postgresDirectUrl ? 'yes' : 'no'}`);
  console.log(`[CONFIG] Frontend revalidation: ${frontendRevalidationConfigured ? 'configured' : 'not fully configured'}`);
  console.log(`[CONFIG] Metrics endpoint protection: ${metricsToken ? 'enabled' : 'disabled'}`);
  console.log(`[CONFIG] Push notifications: ${config.vapidPublicKey ? 'enabled' : 'disabled'}`);
  console.log(`[CONFIG] Email notifications: ${config.emailPass ? 'enabled' : 'disabled'}`);
  console.log(`[CONFIG] Telegram notifications: ${config.telegramBotToken ? 'enabled' : 'disabled'}`);
  for (const warning of runtimeWarnings) {
    console.warn(`[CONFIG] Warning: ${warning}`);
  }
}

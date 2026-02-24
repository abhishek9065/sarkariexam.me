import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';


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
 * Parse JSON object with fallback.
 */
const parseJsonObject = (value: string | undefined): Record<string, any> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch (error) {
    console.warn('[CONFIG] Warning: Failed to parse JSON object env var', error);
  }
  return {};
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

// Get MongoDB connection string (Cosmos DB)
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
const jwtSecret = getRequiredEnv('JWT_SECRET', 'dev-secret');
const adminBackupCodeSalt = process.env.ADMIN_BACKUP_CODE_SALT ?? jwtSecret;

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sarkariexams.me',
  'https://www.sarkariexams.me'
];

const corsOrigins = parseCsv(process.env.CORS_ORIGINS);
const rateLimitWindowMs = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000);
const rateLimitMax = parseNumber(process.env.RATE_LIMIT_MAX, 200);
const authRateLimitMax = parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 20);
const adminRateLimitMax = parseNumber(process.env.ADMIN_RATE_LIMIT_MAX, 200);
const adminIpAllowlist = parseCsv(process.env.ADMIN_IP_ALLOWLIST);
const adminEmailAllowlist = parseCsv(process.env.ADMIN_EMAIL_ALLOWLIST);
const adminDomainAllowlist = parseCsv(process.env.ADMIN_DOMAIN_ALLOWLIST);
const adminEnforceHttps = parseBoolean(process.env.ADMIN_ENFORCE_HTTPS, isProduction);
const adminSetupKey = getRequiredEnv('ADMIN_SETUP_KEY', isProduction ? undefined : 'setup-admin-123');
const adminRequire2FA = parseBoolean(process.env.ADMIN_REQUIRE_2FA, isProduction);
const adminAuthCookieName = process.env.ADMIN_AUTH_COOKIE_NAME ?? 'admin_auth_token';
const adminSetupTokenExpiry = process.env.ADMIN_SETUP_TOKEN_EXPIRY ?? '15m';
const totpIssuer = process.env.TOTP_ISSUER ?? 'SarkariExams Admin';
const totpEncryptionKey = getRequiredEnv('TOTP_ENCRYPTION_KEY', isProduction ? undefined : 'dev-totp-key');
const jwtIssuer = process.env.JWT_ISSUER ?? '';
const jwtAudience = process.env.JWT_AUDIENCE ?? '';
const jwtExpiry = process.env.JWT_EXPIRY ?? '1d';
const adminJwtExpiry = process.env.ADMIN_JWT_EXPIRY ?? '6h';
const passwordHistoryLimit = Math.max(1, parseNumber(process.env.PASSWORD_HISTORY_LIMIT, 5));
const passwordBreachCheckEnabled = parseBoolean(process.env.PASSWORD_BREACH_CHECK_ENABLED, true);
const passwordBreachCheckTimeoutMs = Math.max(500, parseNumber(process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS, 2500));
const adminSessionIdleTimeoutMinutes = Math.max(5, parseNumber(process.env.ADMIN_SESSION_IDLE_TIMEOUT_MINUTES, 30));
const adminSessionAbsoluteTimeoutHours = Math.max(1, parseNumber(process.env.ADMIN_SESSION_ABSOLUTE_TIMEOUT_HOURS, 12));
const adminStepUpTtlSeconds = Math.max(60, parseNumber(process.env.ADMIN_STEP_UP_TTL_SECONDS, 10 * 60));
const adminDualApprovalRequired = parseBoolean(process.env.ADMIN_DUAL_APPROVAL_REQUIRED, true);
const adminApprovalExpiryMinutes = Math.max(5, parseNumber(process.env.ADMIN_APPROVAL_EXPIRY_MINUTES, 30));
const adminApprovalRetentionDays = Math.max(1, parseNumber(process.env.ADMIN_APPROVAL_RETENTION_DAYS, 30));
const adminApprovalCleanupIntervalMinutes = Math.max(5, parseNumber(process.env.ADMIN_APPROVAL_CLEANUP_INTERVAL_MINUTES, 60));
const adminApprovalPolicyMatrix = parseJsonObject(process.env.ADMIN_APPROVAL_POLICY_MATRIX);
const adminSecurityAlertEmail = process.env.ADMIN_SECURITY_ALERT_EMAIL ?? '';
const securityLogRetentionHours = Math.max(1, parseNumber(process.env.SECURITY_LOG_RETENTION_HOURS, 24));
const securityLogPersistenceEnabled = parseBoolean(process.env.SECURITY_LOG_PERSISTENCE_ENABLED, true);
const securityLogDbRetentionDays = Math.max(1, parseNumber(process.env.SECURITY_LOG_DB_RETENTION_DAYS, 30));
const securityLogCleanupIntervalMinutes = Math.max(5, parseNumber(process.env.SECURITY_LOG_CLEANUP_INTERVAL_MINUTES, 60));
const featureFlags = {
  search_overlay_v2: parseBoolean(process.env.FEATURE_SEARCH_OVERLAY_V2, true),
  compare_jobs_v2: parseBoolean(process.env.FEATURE_COMPARE_JOBS_V2, true),
  tracker_api_v2: parseBoolean(process.env.FEATURE_TRACKER_API_V2, true),
  dashboard_widgets_v2: parseBoolean(process.env.FEATURE_DASHBOARD_WIDGETS_V2, true),
  admin_nav_ux_v2: parseBoolean(process.env.FEATURE_ADMIN_NAV_UX_V2, true),
  admin_analytics_ux_v2: parseBoolean(process.env.FEATURE_ADMIN_ANALYTICS_UX_V2, true),
  admin_lists_ux_v2: parseBoolean(process.env.FEATURE_ADMIN_LISTS_UX_V2, true),
  admin_lists_v3: parseBoolean(process.env.FEATURE_ADMIN_LISTS_V3, false),
  admin_review_v3: parseBoolean(process.env.FEATURE_ADMIN_REVIEW_V3, false),
  admin_analytics_v3: parseBoolean(process.env.FEATURE_ADMIN_ANALYTICS_V3, false),
  admin_command_palette_v1: parseBoolean(process.env.FEATURE_ADMIN_COMMAND_PALETTE_V1, false),
};

// Validate secrets aren't using known insecure defaults in production
validateSecret('JWT_SECRET', jwtSecret, ['dev-secret', 'change-me', 'secret', 'jwt-secret']);
validateSecret('ADMIN_SETUP_KEY', adminSetupKey, ['setup-admin-123', 'change-me', 'admin-setup']);
validateSecret('TOTP_ENCRYPTION_KEY', totpEncryptionKey, ['dev-totp-key', 'change-me', 'secret']);
if (process.env.ADMIN_BACKUP_CODE_SALT) {
  validateSecret('ADMIN_BACKUP_CODE_SALT', adminBackupCodeSalt, ['change-me', 'admin-backup-salt', 'backup-salt']);
}

if (isProduction && adminEmailAllowlist.length === 0 && adminDomainAllowlist.length === 0) {
  throw new Error('SECURITY ERROR: ADMIN_EMAIL_ALLOWLIST or ADMIN_DOMAIN_ALLOWLIST is required in production.');
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl,
  jwtSecret,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : defaultCorsOrigins,
  rateLimitWindowMs,
  rateLimitMax,
  authRateLimitMax,
  adminRateLimitMax,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  adminIpAllowlist,
  adminEmailAllowlist,
  adminDomainAllowlist,
  adminEnforceHttps,
  adminSetupKey,
  adminRequire2FA,
  adminAuthCookieName,
  adminSetupTokenExpiry,
  totpIssuer,
  totpEncryptionKey,
  adminBackupCodeSalt,
  jwtIssuer,
  jwtAudience,
  jwtExpiry,
  adminJwtExpiry,
  passwordHistoryLimit,
  passwordBreachCheckEnabled,
  passwordBreachCheckTimeoutMs,
  adminSessionIdleTimeoutMinutes,
  adminSessionAbsoluteTimeoutHours,
  adminStepUpTtlSeconds,
  adminDualApprovalRequired,
  adminApprovalExpiryMinutes,
  adminApprovalRetentionDays,
  adminApprovalCleanupIntervalMinutes,
  adminApprovalPolicyMatrix,
  adminSecurityAlertEmail,
  securityLogRetentionHours,
  securityLogPersistenceEnabled,
  securityLogDbRetentionDays,
  securityLogCleanupIntervalMinutes,
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

  // VAPID keys for web push notifications (optional)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
};

// Log configuration status on startup (without exposing secrets)
if (!isProduction) {
  console.log('[CONFIG] Running in development mode');
  console.log(`[CONFIG] Database: ${databaseUrl.includes('localhost') ? 'local MongoDB' : 'Cosmos DB'}`);
  console.log(`[CONFIG] Push notifications: ${config.vapidPublicKey ? 'enabled' : 'disabled'}`);
  console.log(`[CONFIG] Email notifications: ${config.emailPass ? 'enabled' : 'disabled'}`);
  console.log(`[CONFIG] Telegram notifications: ${config.telegramBotToken ? 'enabled' : 'disabled'}`);
}

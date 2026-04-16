require('dotenv').config();
const crypto = require('crypto');

// Generate a strong random secret if not provided (for development only)
const generateSecureSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,

  // JWT - Require strong secret in production
  jwtSecret: process.env.JWT_SECRET || (
    process.env.NODE_ENV === 'production' 
      ? (() => { throw new Error('JWT_SECRET must be set in production. Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'); })()
      : generateSecureSecret()
  ),
  jwtExpire: process.env.JWT_EXPIRE || '1h',

  // GitHub
  githubToken: process.env.GITHUB_TOKEN,
  githubOwner: process.env.GITHUB_OWNER,
  githubRepo: process.env.GITHUB_REPO || 'exam-data',
  githubBranch: process.env.GITHUB_BRANCH || 'main',
  excelPath: process.env.EXCEL_PATH || 'data',

  // Admin defaults
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',

  // Proctoring
  proctorViolationThreshold: parseInt(process.env.PROCTOR_VIOLATION_THRESHOLD) || 5,
  proctorAutoSubmit: process.env.PROCTOR_AUTO_SUBMIT === 'true',

  // PostgreSQL / CockroachDB
  databaseUrl: process.env.DATABASE_URL || null,

  // Security
  requirePasswordChange: process.env.REQUIRE_PASSWORD_CHANGE !== 'false' // Default true
};

// Validate required env vars
if (!env.databaseUrl) {
  if (env.nodeEnv === 'production') {
    console.error('FATAL: DATABASE_URL must be set in production.');
    process.exit(1);
  } else {
    console.warn('WARNING: DATABASE_URL not set. Using a local PostgreSQL database or CockroachDB connection string is required.');
  }
}

// Validate JWT secret strength in production
if (env.nodeEnv === 'production' && env.jwtSecret.length < 32) {
  console.error('ERROR: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

module.exports = env;

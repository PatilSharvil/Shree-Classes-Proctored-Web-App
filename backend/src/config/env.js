require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
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
  
  // SQLite
  sqliteDbPath: process.env.SQLITE_DB_PATH || './data/exam.db'
};

// Validate required env vars
if (!env.githubToken && env.nodeEnv === 'production') {
  console.warn('WARNING: GITHUB_TOKEN not set. GitHub sync will fail in production.');
}

module.exports = env;

const db = require('../config/database');

// In-memory store for failed login attempts (in production, use Redis)
const failedAttempts = new Map();

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Record a failed login attempt
 * @param {string} identifier - Email or IP address
 * @returns {Object} - Lockout status
 */
const recordFailedAttempt = (identifier) => {
  const now = Date.now();
  const attempts = failedAttempts.get(identifier) || { count: 0, firstAttempt: now, lockoutUntil: null };
  
  attempts.count += 1;
  attempts.lastAttempt = now;
  
  // Check if lockout threshold reached
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockoutUntil = now + LOCKOUT_DURATION_MS;
  }
  
  failedAttempts.set(identifier, attempts);
  
  return {
    isLocked: attempts.lockoutUntil !== null && attempts.lockoutUntil > now,
    lockoutUntil: attempts.lockoutUntil,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
  };
};

/**
 * Check if an identifier is locked out
 * @param {string} identifier - Email or IP address
 * @returns {Object} - Lockout status
 */
const isLockedOut = (identifier) => {
  const attempts = failedAttempts.get(identifier);
  
  if (!attempts) {
    return { isLocked: false, lockoutUntil: null, attemptsRemaining: MAX_ATTEMPTS };
  }
  
  const now = Date.now();
  
  // Check if lockout has expired
  if (attempts.lockoutUntil && attempts.lockoutUntil <= now) {
    // Reset attempts after lockout expires
    failedAttempts.delete(identifier);
    return { isLocked: false, lockoutUntil: null, attemptsRemaining: MAX_ATTEMPTS };
  }
  
  return {
    isLocked: attempts.lockoutUntil !== null && attempts.lockoutUntil > now,
    lockoutUntil: attempts.lockoutUntil,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
  };
};

/**
 * Clear failed attempts after successful login
 * @param {string} identifier - Email or IP address
 */
const clearFailedAttempts = (identifier) => {
  failedAttempts.delete(identifier);
};

/**
 * Get failed attempts count for an identifier
 * @param {string} identifier - Email or IP address
 * @returns {number} - Number of failed attempts
 */
const getFailedAttemptsCount = (identifier) => {
  const attempts = failedAttempts.get(identifier);
  return attempts ? attempts.count : 0;
};

/**
 * Cleanup expired lockouts periodically
 */
const cleanupExpiredLockouts = () => {
  const now = Date.now();
  
  for (const [identifier, attempts] of failedAttempts.entries()) {
    if (attempts.lockoutUntil && attempts.lockoutUntil <= now) {
      failedAttempts.delete(identifier);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredLockouts, CLEANUP_INTERVAL_MS);

/**
 * Get stats for monitoring (admin use)
 * @returns {Object} - Stats about locked accounts
 */
const getLockoutStats = () => {
  const now = Date.now();
  let totalLocked = 0;
  let totalAttempts = 0;
  
  for (const [identifier, attempts] of failedAttempts.entries()) {
    totalAttempts += attempts.count;
    if (attempts.lockoutUntil && attempts.lockoutUntil > now) {
      totalLocked++;
    }
  }
  
  return {
    totalLocked,
    totalAttempts,
    activeIdentifiers: failedAttempts.size
  };
};

module.exports = {
  recordFailedAttempt,
  isLockedOut,
  clearFailedAttempts,
  getFailedAttemptsCount,
  getLockoutStats,
  // For testing
  _clearAll: () => failedAttempts.clear()
};

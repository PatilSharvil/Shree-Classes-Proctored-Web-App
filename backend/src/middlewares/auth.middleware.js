const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from:
 * 1. Authorization header (Bearer token) - PRIMARY for cross-origin
 * 2. httpOnly cookie (auth_token) - FALLBACK for same-origin
 */
const authenticate = (req, res, next) => {
  try {
    let token = null;
    let tokenSource = 'none';

    // PRIORITY 1: Try Authorization header (works with Cloudflare/proxy)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      tokenSource = 'Authorization header';
    }

    // PRIORITY 2: Try httpOnly cookie (for same-origin/local development)
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      tokenSource = 'httpOnly cookie';
    }

    if (!token) {
      console.log('[authenticate] No token found. Auth header:', !!authHeader, 'Cookie:', !!req.cookies?.auth_token);
      return errorResponse(res, 401, 'Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    console.log('[authenticate] Token verified from:', tokenSource, 'User:', decoded.email);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid token.');
    }
    return errorResponse(res, 500, 'Authentication error.', error.message);
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Insufficient permissions.');
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attaches user if token present, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.jwtSecret);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};

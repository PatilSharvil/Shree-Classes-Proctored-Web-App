const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header OR httpOnly cookie
 */
const authenticate = (req, res, next) => {
  try {
    let token = null;

    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no header token, try httpOnly cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return errorResponse(res, 401, 'Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
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

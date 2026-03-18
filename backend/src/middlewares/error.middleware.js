const logger = require('../utils/logger');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and formats response
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return errorResponse(res, 400, 'Validation Error', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, 409, `${field} already exists.`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token.');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired.');
  }

  // SQLite errors
  if (err.message?.includes('SQLITE')) {
    return errorResponse(res, 500, 'Database error.', err.message);
  }

  // GitHub API errors
  if (err.status && err.message?.includes('API')) {
    return errorResponse(res, err.status || 500, 'External service error.', err.message);
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, `Route ${req.originalUrl} not found.`);
};

module.exports = {
  errorHandler,
  notFoundHandler
};

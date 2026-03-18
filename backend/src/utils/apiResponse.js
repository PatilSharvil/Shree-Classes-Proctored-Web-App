/**
 * Standard API response formatter
 */
const apiResponse = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data
  });
};

/**
 * Error response formatter
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated response formatter
 */
const paginatedResponse = (res, statusCode, data, pagination, message = 'Success') => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    pagination
  });
};

module.exports = {
  apiResponse,
  errorResponse,
  paginatedResponse
};

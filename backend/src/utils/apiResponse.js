/**
 * Standard API response formatter
 */
const apiResponse = (res, statusCode, data, message = 'Success') => {
  const response = {
    success: statusCode < 400,
    message,
    data
  };

  // Include CSRF token in response headers
  if (res.req && res.req.csrfToken) {
    res.setHeader('X-CSRF-Token', res.req.csrfToken);
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response formatter
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  };

  // Include CSRF token in response headers even for errors
  if (res.req && res.req.csrfToken) {
    res.setHeader('X-CSRF-Token', res.req.csrfToken);
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated response formatter
 */
const paginatedResponse = (res, statusCode, data, pagination, message = 'Success') => {
  const response = {
    success: statusCode < 400,
    message,
    data,
    pagination
  };

  // Include CSRF token in response headers
  if (res.req && res.req.csrfToken) {
    res.setHeader('X-CSRF-Token', res.req.csrfToken);
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  apiResponse,
  errorResponse,
  paginatedResponse
};

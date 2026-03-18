const authService = require('./auth.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Login controller
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required.');
    }

    const result = await authService.login(email, password);
    return apiResponse(res, 200, result, 'Login successful');
  } catch (error) {
    if (error.message === 'Invalid email or password.') {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Login failed.', error.message);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    return apiResponse(res, 200, req.user, 'Current user info');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get user info.', error.message);
  }
};

module.exports = {
  login,
  getMe
};

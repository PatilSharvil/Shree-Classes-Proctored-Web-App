const authService = require('./auth.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');

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

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Current password and new password are required.');
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return errorResponse(res, 401, 'Current password is incorrect.');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return errorResponse(res, 400, 'New password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(newPassword)) {
      return errorResponse(res, 400, 'New password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(newPassword)) {
      return errorResponse(res, 400, 'New password must contain at least one number.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    db.prepare(`
      UPDATE users 
      SET password = ?, must_change_password = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(hashedPassword, userId);

    return apiResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to change password', error.message);
  }
};

module.exports = {
  login,
  getMe,
  changePassword
};

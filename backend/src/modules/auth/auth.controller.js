const authService = require('./auth.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const env = require('../../config/env');
const lockoutService = require('../../services/lockoutService');

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

    // Get client identifier (email + IP for more accurate tracking)
    const clientIP = req.ip || req.connection.remoteAddress;
    const identifier = `${email}:${clientIP}`;

    // Check if account is locked out
    const lockoutStatus = lockoutService.isLockedOut(identifier);
    if (lockoutStatus.isLocked) {
      const minutesLeft = Math.ceil((lockoutStatus.lockoutUntil - Date.now()) / 60000);
      return errorResponse(res, 423, `Account temporarily locked due to multiple failed attempts. Please try again in ${minutesLeft} minutes.`);
    }

    const result = await authService.login(email, password);
    
    // Clear failed attempts on successful login
    lockoutService.clearFailedAttempts(identifier);
    
    // Set JWT as httpOnly cookie
    const cookieOptions = {
      httpOnly: true, // Not accessible via JavaScript
      secure: env.nodeEnv === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    };
    
    res.cookie('auth_token', result.token, cookieOptions);
    
    // Return user data without token (token is in cookie)
    const { token, ...userData } = result.user;
    
    return apiResponse(res, 200, { user: userData, cookieSet: true }, 'Login successful');
  } catch (error) {
    if (error.message === 'Invalid email or password.') {
      // Record failed attempt
      const clientIP = req.ip || req.connection.remoteAddress;
      const identifier = `${email || 'unknown'}:${clientIP}`;
      const lockoutStatus = lockoutService.recordFailedAttempt(identifier);
      
      // Log the failed attempt for security monitoring
      console.log(`[SECURITY] Failed login attempt for ${email || 'unknown'} from ${clientIP}. Attempts remaining: ${lockoutStatus.attemptsRemaining}`);
      
      // Return generic error message (don't reveal if email exists)
      if (lockoutStatus.attemptsRemaining <= 2 && lockoutStatus.attemptsRemaining > 0) {
        return errorResponse(res, 401, `Invalid credentials. ${lockoutStatus.attemptsRemaining} attempt(s) remaining before account lockout.`);
      }
      
      return errorResponse(res, 401, 'Invalid email or password.');
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
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    return apiResponse(res, 200, null, 'Logout successful');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to logout', error.message);
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
  logout,
  changePassword
};

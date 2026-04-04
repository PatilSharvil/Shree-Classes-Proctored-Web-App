const authService = require('./auth.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../config/database');
const env = require('../../config/env');
const lockoutService = require('../../services/lockoutService');

/**
 * Login controller
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;

  try {
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

    // Set JWT as httpOnly cookie (for same-origin/local development)
    const cookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    };

    res.cookie('auth_token', result.token, cookieOptions);

    // Generate and set CSRF token for the session
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.setHeader('X-CSRF-Token', csrfToken);

    // CRITICAL: Return token in response body as fallback
    // Cloudflare/proxies may strip Set-Cookie headers for cross-origin requests
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Return user data WITH token in response body for Authorization header fallback
    return apiResponse(res, 200, {
      user: result.user,
      token: result.token, // Token in body for localStorage fallback
      cookieSet: true
    }, 'Login successful');
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
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
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
    console.log('[changePassword] Request received');
    console.log('[changePassword] User ID from token:', req.user?.id);
    console.log('[changePassword] Request body keys:', Object.keys(req.body));
    
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      console.log('[changePassword] Missing currentPassword or newPassword');
      return errorResponse(res, 400, 'Current password and new password are required.');
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      console.log('[changePassword] User not found:', userId);
      return errorResponse(res, 404, 'User not found.');
    }

    console.log('[changePassword] User found:', user.email, 'must_change_password:', user.must_change_password);

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      console.log('[changePassword] Current password is incorrect for user:', user.email);
      return errorResponse(res, 401, 'Current password is incorrect.');
    }

    console.log('[changePassword] Current password verified successfully');

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

    console.log('[changePassword] New password validation passed');

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    const result = db.prepare(`
      UPDATE users
      SET password = ?, must_change_password = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(hashedPassword, userId);

    console.log('[changePassword] Password updated successfully. Rows changed:', result.changes);

    return apiResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    console.error('[changePassword] Error occurred:', error.message);
    console.error('[changePassword] Error stack:', error.stack);
    return errorResponse(res, 500, 'Failed to change password', error.message);
  }
};

module.exports = {
  login,
  getMe,
  logout,
  changePassword
};

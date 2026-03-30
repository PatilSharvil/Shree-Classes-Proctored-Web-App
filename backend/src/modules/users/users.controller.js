const authService = require('../auth/auth.service');
const { apiResponse, errorResponse, paginatedResponse } = require('../../utils/apiResponse');
const db = require('../../config/database');

/**
 * Get all users
 * GET /api/users
 */
const getAllUsers = (req, res) => {
  try {
    const users = authService.getAllUsers();
    return apiResponse(res, 200, users, 'Users retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get users.', error.message);
  }
};

/**
 * Get user by ID (Only own profile or admin)
 * GET /api/users/:id
 */
const getUserById = (req, res) => {
  try {
    const requestedUserId = req.params.id;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Users can only access their own profile unless they're admin
    if (!isAdmin && requestedUserId !== currentUserId) {
      return errorResponse(res, 403, 'Access denied. You can only access your own profile.');
    }

    const user = authService.getUserById(requestedUserId);
    // Don't expose sensitive data
    const { password, ...userWithoutPassword } = user;
    return apiResponse(res, 200, userWithoutPassword, 'User retrieved successfully');
  } catch (error) {
    if (error.message === 'User not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to get user.', error.message);
  }
};

/**
 * Create new user
 * POST /api/users
 */
const createUser = (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !role) {
      return errorResponse(res, 400, 'Email, password, and role are required.');
    }

    if (!['ADMIN', 'STUDENT'].includes(role)) {
      return errorResponse(res, 400, 'Role must be ADMIN or STUDENT.');
    }

    const user = authService.createUser({ email, password, name, role }, req.user.id);
    return apiResponse(res, 201, user, 'User created successfully');
  } catch (error) {
    if (error.message === 'User with this email already exists.') {
      return errorResponse(res, 409, error.message);
    }
    return errorResponse(res, 500, 'Failed to create user.', error.message);
  }
};

/**
 * Update user (Only own profile or admin)
 * PUT /api/users/:id
 */
const updateUser = (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Users can only update their own profile unless they're admin
    if (!isAdmin && targetUserId !== currentUserId) {
      return errorResponse(res, 403, 'Access denied. You can only update your own profile.');
    }

    const { email, password, name, role } = req.body;

    // Non-admin users cannot change their role
    if (!isAdmin && role) {
      return errorResponse(res, 403, 'Access denied. You cannot change your role.');
    }

    // Non-admin users cannot change their email
    if (!isAdmin && email) {
      return errorResponse(res, 403, 'Access denied. You cannot change your email.');
    }

    const user = authService.updateUser(targetUserId, { email, password, name, role });
    const { password: _, ...userWithoutPassword } = user;
    return apiResponse(res, 200, userWithoutPassword, 'User updated successfully');
  } catch (error) {
    if (error.message === 'User not found.' || error.message === 'Email already in use.') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to update user.', error.message);
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    // Prevent admin from deleting themselves
    if (targetUserId === currentUserId) {
      return errorResponse(res, 400, 'Cannot delete your own account.');
    }

    const result = authService.deleteUser(targetUserId);
    return apiResponse(res, 200, result, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found.' || error.message === 'Cannot delete admin user.') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to delete user.', error.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

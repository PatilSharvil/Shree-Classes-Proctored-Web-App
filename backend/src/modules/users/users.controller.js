const authService = require('../auth/auth.service');
const { apiResponse, errorResponse, paginatedResponse } = require('../../utils/apiResponse');

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
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = (req, res) => {
  try {
    const user = authService.getUserById(req.params.id);
    return apiResponse(res, 200, user, 'User retrieved successfully');
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
 * Update user
 * PUT /api/users/:id
 */
const updateUser = (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const user = authService.updateUser(req.params.id, { email, password, name, role });
    return apiResponse(res, 200, user, 'User updated successfully');
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
    const result = authService.deleteUser(req.params.id);
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

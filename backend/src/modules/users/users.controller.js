const authService = require('../auth/auth.service');
const excelService = require('../../services/excelService');
const { apiResponse, errorResponse, paginatedResponse } = require('../../utils/apiResponse');

/**
 * Get all users
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return apiResponse(res, 200, users, 'Users retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get users.', error.message);
  }
};

/**
 * Get user by ID (Only own profile or admin)
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const requestedUserId = req.params.id;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Users can only access their own profile unless they're admin
    if (!isAdmin && requestedUserId !== currentUserId) {
      return errorResponse(res, 403, 'Access denied. You can only access your own profile.');
    }

    const user = await authService.getUserById(requestedUserId);
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
const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !role) {
      return errorResponse(res, 400, 'Email, password, and role are required.');
    }

    if (!['ADMIN', 'STUDENT'].includes(role)) {
      return errorResponse(res, 400, 'Role must be ADMIN or STUDENT.');
    }

    const user = await authService.createUser({ email, password, name, role }, req.user.id);
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
const updateUser = async (req, res) => {
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

    const user = await authService.updateUser(targetUserId, { email, password, name, role });
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
const deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    // Prevent admin from deleting themselves
    if (targetUserId === currentUserId) {
      return errorResponse(res, 400, 'Cannot delete your own account.');
    }

    const result = await authService.deleteUser(targetUserId);
    return apiResponse(res, 200, result, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found.' || error.message === 'Cannot delete admin user.') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to delete user.', error.message);
  }
};

/**
 * Upload students via Excel file
 * POST /api/users/upload
 */
const uploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'Excel file is required.');
    }

    // Parse Excel file
    const excelData = excelService.importFromBuffer(req.file.buffer);

    if (!excelData || excelData.length === 0) {
      return errorResponse(res, 400, 'Excel file is empty or invalid.');
    }

    // Map Excel data to student format
    const studentsData = excelData.map(row => ({
      name: row.Name || row.name || '',
      email: row.Email || row.email || '',
      password: row.Password || row.password || ''
    }));

    // Import students
    const result = await authService.bulkImportStudents(studentsData, req.user.id);
    
    const statusCode = result.success > 0 ? 201 : 400;
    return apiResponse(res, statusCode, result, 'Students import completed');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to import students.', error.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadStudents
};

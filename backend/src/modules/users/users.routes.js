const express = require('express');
const router = express.Router();
const multer = require('multer');
const usersController = require('./users.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Multer config for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authorize('ADMIN'), usersController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Only own profile or admin)
 * @access  Private
 */
router.get('/:id', usersController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('ADMIN'), usersController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (Only own profile or admin)
 * @access  Private
 */
router.put('/:id', usersController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('ADMIN'), usersController.deleteUser);

/**
 * @route   POST /api/users/upload
 * @desc    Bulk upload students via Excel file (Admin only)
 * @access  Private/Admin
 */
router.post('/upload', authorize('ADMIN'), upload.single('file'), usersController.uploadStudents);

module.exports = router;

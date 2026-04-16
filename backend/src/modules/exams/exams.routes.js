const express = require('express');
const router = express.Router();
const examsController = require('./exams.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);


/**
 * @route   POST /api/exams
 * @desc    Create exam (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('ADMIN'), examsController.createExam);

/**
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Private
 */
router.get('/', examsController.getAllExams);

/**
 * @route   GET /api/exams/active
 * @desc    Get active exams
 * @access  Private
 */
router.get('/active', examsController.getActiveExams);

/**
 * @route   GET /api/exams/:id
 * @desc    Get exam by ID
 * @access  Private
 */
router.get('/:id', examsController.getExamById);

/**
 * @route   GET /api/exams/:id/stats
 * @desc    Get exam statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/:id/stats', authorize('ADMIN'), examsController.getExamStats);

/**
 * @route   GET /api/exams/:id/availability
 * @desc    Check if exam is available
 * @access  Private
 */
router.get('/:id/availability', examsController.checkAvailability);

/**
 * @route   PUT /api/exams/:id
 * @desc    Update exam (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('ADMIN'), examsController.updateExam);

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete exam (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('ADMIN'), examsController.deleteExam);

module.exports = router;

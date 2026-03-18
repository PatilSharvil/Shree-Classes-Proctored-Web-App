const express = require('express');
const router = express.Router();
const proctoringController = require('./proctoring.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/proctoring/violations
 * @desc    Record a violation
 * @access  Private
 */
router.post('/violations', proctoringController.recordViolation);

/**
 * @route   GET /api/proctoring/violations/:sessionId
 * @desc    Get violations for a session
 * @access  Private
 */
router.get('/violations/:sessionId', proctoringController.getSessionViolations);

/**
 * @route   GET /api/proctoring/check-submit/:sessionId
 * @desc    Check if should auto-submit
 * @access  Private
 */
router.get('/check-submit/:sessionId', proctoringController.checkAutoSubmit);

/**
 * @route   GET /api/proctoring/stats/:examId
 * @desc    Get exam violation stats (Admin only)
 * @access  Private/Admin
 */
router.get('/stats/:examId', authorize('ADMIN'), proctoringController.getExamViolationStats);

/**
 * @route   GET /api/proctoring/breakdown
 * @desc    Get violation type breakdown (Admin only)
 * @access  Private/Admin
 */
router.get('/breakdown', authorize('ADMIN'), proctoringController.getViolationTypeBreakdown);

/**
 * @route   DELETE /api/proctoring/violations/:sessionId
 * @desc    Clear violations (Admin only)
 * @access  Private/Admin
 */
router.delete('/violations/:sessionId', authorize('ADMIN'), proctoringController.clearViolations);

module.exports = router;

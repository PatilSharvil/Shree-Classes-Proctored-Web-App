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
 * @route   POST /api/proctoring/log
 * @desc    Log a proctoring activity event
 * @access  Private
 */
router.post('/log', proctoringController.logActivity);

/**
 * @route   GET /api/proctoring/violations/:sessionId
 * @desc    Get violations for a session
 * @access  Private
 */
router.get('/violations/:sessionId', proctoringController.getSessionViolations);

/**
 * @route   GET /api/proctoring/activity/:sessionId
 * @desc    Get activity logs for a session
 * @access  Private
 */
router.get('/activity/:sessionId', proctoringController.getSessionActivityLogs);

/**
 * @route   GET /api/proctoring/timeline/:sessionId
 * @desc    Get activity timeline for a session
 * @access  Private
 */
router.get('/timeline/:sessionId', proctoringController.getSessionActivityTimeline);

/**
 * @route   GET /api/proctoring/check-submit/:sessionId
 * @desc    Check if should auto-submit
 * @access  Private
 */
router.get('/check-submit/:sessionId', proctoringController.checkAutoSubmit);

/**
 * @route   GET /api/proctoring/score/:sessionId
 * @desc    Get weighted violation score
 * @access  Private
 */
router.get('/score/:sessionId', proctoringController.getViolationScore);

/**
 * @route   GET /api/proctoring/stats/:examId
 * @desc    Get exam violation stats (Admin only)
 * @access  Private/Admin
 */
router.get('/stats/:examId', authorize('ADMIN'), proctoringController.getExamViolationStats);

/**
 * @route   GET /api/proctoring/summary/:examId
 * @desc    Get exam activity summary (Admin only)
 * @access  Private/Admin
 */
router.get('/summary/:examId', authorize('ADMIN'), proctoringController.getExamActivitySummary);

/**
 * @route   GET /api/proctoring/live/:examId
 * @desc    Get live active sessions for an exam (Admin only)
 * @access  Private/Admin
 */
router.get('/live/:examId', authorize('ADMIN'), proctoringController.getLiveActiveSessions);

/**
 * @route   GET /api/proctoring/breakdown
 * @desc    Get violation type breakdown (Admin only)
 * @access  Private/Admin
 */
router.get('/breakdown', authorize('ADMIN'), proctoringController.getViolationTypeBreakdown);

/**
 * @route   GET /api/proctoring/patterns
 * @desc    Get violation patterns across all exams (Admin only)
 * @access  Private/Admin
 */
router.get('/patterns', authorize('ADMIN'), proctoringController.getViolationPatterns);

/**
 * @route   DELETE /api/proctoring/violations/:sessionId
 * @desc    Clear violations (Admin only)
 * @access  Private/Admin
 */
router.delete('/violations/:sessionId', authorize('ADMIN'), proctoringController.clearViolations);

/**
 * @route   GET /api/proctoring/export/:examId
 * @desc    Export proctoring report (Admin only)
 * @access  Private/Admin
 */
router.get('/export/:examId', authorize('ADMIN'), proctoringController.exportProctoringReport);

/**
 * @route   POST /api/proctoring/snapshots
 * @desc    Save AI proctoring snapshot
 * @access  Private
 */
router.post('/snapshots', proctoringController.saveSnapshot);

/**
 * @route   GET /api/proctoring/snapshots/:sessionId
 * @desc    Get snapshots for a session
 * @access  Private
 */
router.get('/snapshots/:sessionId', proctoringController.getSessionSnapshots);

/**
 * @route   GET /api/proctoring/evidence/:examId
 * @desc    Get evidence gallery for an exam (Admin only)
 * @access  Private/Admin
 */
router.get('/evidence/:examId', authorize('ADMIN'), proctoringController.getExamEvidenceGallery);

/**
 * @route   GET /api/proctoring/storage-stats
 * @desc    Get storage statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/storage-stats', authorize('ADMIN'), proctoringController.getStorageStats);

/**
 * @route   POST /api/proctoring/cleanup
 * @desc    Cleanup expired snapshots (Admin only)
 * @access  Private/Admin
 */
router.post('/cleanup', authorize('ADMIN'), proctoringController.cleanupSnapshots);

module.exports = router;

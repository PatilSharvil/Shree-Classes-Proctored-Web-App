const express = require('express');
const router = express.Router();
const attemptsController = require('./attempts.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/attempts/start
 * @desc    Start a new exam attempt
 * @access  Private
 */
router.post('/start', attemptsController.startAttempt);

/**
 * @route   GET /api/attempts/active/:examId
 * @desc    Get active session for an exam
 * @access  Private
 */
router.get('/active/:examId', attemptsController.getActiveSession);

/**
 * @route   POST /api/attempts/:sessionId/respond
 * @desc    Save response for a question
 * @access  Private
 */
router.post('/:sessionId/respond', attemptsController.saveResponse);

/**
 * @route   PUT /api/attempts/:sessionId/question
 * @desc    Update current question index
 * @access  Private
 */
router.put('/:sessionId/question', attemptsController.updateCurrentQuestion);

/**
 * @route   POST /api/attempts/:sessionId/submit
 * @desc    Submit exam
 * @access  Private
 */
router.post('/:sessionId/submit', attemptsController.submitExam);

/**
 * @route   GET /api/attempts/history
 * @desc    Get user's attempt history
 * @access  Private
 */
router.get('/history', attemptsController.getAttemptHistory);

/**
 * @route   GET /api/attempts/:sessionId/details
 * @desc    Get attempt details with responses
 * @access  Private
 */
router.get('/:sessionId/details', attemptsController.getAttemptDetails);

/**
 * @route   GET /api/attempts/exam/:examId
 * @desc    Get all attempts for an exam (Admin only)
 * @access  Private/Admin
 */
router.get('/exam/:examId', authorize('ADMIN'), attemptsController.getExamAttempts);

module.exports = router;

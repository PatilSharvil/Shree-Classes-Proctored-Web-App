const express = require('express');
const router = express.Router();
const multer = require('multer');
const questionsController = require('./questions.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/exams/:examId/questions
 * @desc    Add question to exam (Admin only)
 * @access  Private/Admin
 */
router.post('/exams/:examId/questions', authorize('ADMIN'), questionsController.addQuestion);

/**
 * @route   POST /api/exams/:examId/questions/bulk
 * @desc    Add multiple questions (Admin only)
 * @access  Private/Admin
 */
router.post('/exams/:examId/questions/bulk', authorize('ADMIN'), questionsController.addQuestionsBulk);

/**
 * @route   POST /api/exams/:examId/questions/upload
 * @desc    Upload questions via Excel (Admin only)
 * @access  Private/Admin
 */
router.post('/exams/:examId/questions/upload', authorize('ADMIN'), upload.single('file'), questionsController.uploadQuestions);

/**
 * @route   GET /api/exams/:examId/questions
 * @desc    Get questions for an exam
 * @access  Private
 */
router.get('/exams/:examId/questions', questionsController.getQuestions);

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID (Admin only)
 * @access  Private/Admin
 */
router.get('/questions/:id', authorize('ADMIN'), questionsController.getQuestionById);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question (Admin only)
 * @access  Private/Admin
 */
router.put('/questions/:id', authorize('ADMIN'), questionsController.updateQuestion);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question (Admin only)
 * @access  Private/Admin
 */
router.delete('/questions/:id', authorize('ADMIN'), questionsController.deleteQuestion);

module.exports = router;

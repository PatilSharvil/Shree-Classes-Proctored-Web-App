const express = require('express');
const router = express.Router();
const examsController = require('./exams.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const db = require('../../config/database');
const logger = require('../../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/exams/sync-to-github
 * @desc    Manually trigger GitHub sync (Admin only)
 * @access  Private/Admin
 */
router.post('/sync-to-github', authorize('ADMIN'), async (req, res) => {
  try {
    const githubService = require('../../services/githubService');

    if (!githubService.isConfigured()) {
      return errorResponse(res, 400, 'GitHub sync is not configured. Please set GITHUB_TOKEN and GITHUB_OWNER in .env');
    }

    // Export data from SQLite
    const students = db.prepare(`SELECT id, email, name, role, created_at FROM users WHERE role = 'STUDENT'`).all();
    const exams = db.prepare(`SELECT * FROM exams`).all();
    const questions = db.prepare(`SELECT * FROM questions`).all();
    const attempts = db.prepare(`SELECT * FROM attempt_history`).all();

    // Sync to GitHub
    const results = await githubService.batchSync({ students, exams, questions, attempts });

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;

    logger.info(`Manual GitHub sync: ${successCount} succeeded, ${failCount} failed`);

    return apiResponse(res, 200, { results, successCount, failCount }, 'GitHub sync completed');
  } catch (error) {
    logger.error('Manual GitHub sync failed:', error);
    return errorResponse(res, 500, 'GitHub sync failed', error.message);
  }
});

/**
 * @route   GET /api/exams/sync-status
 * @desc    Check GitHub sync configuration status (Admin only)
 * @access  Private/Admin
 */
router.get('/sync-status', authorize('ADMIN'), (req, res) => {
  const githubService = require('../../services/githubService');
  const env = require('../../config/env');

  return apiResponse(res, 200, {
    configured: githubService.isConfigured(),
    owner: env.githubOwner || null,
    repo: env.githubRepo || null,
    branch: env.githubBranch || null,
    excelPath: env.excelPath || null,
    tokenConfigured: !!(env.githubToken && !env.githubToken.includes('YOUR_TOKEN'))
  }, 'GitHub sync status');
});

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

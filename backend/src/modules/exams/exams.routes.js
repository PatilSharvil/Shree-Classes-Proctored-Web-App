const express = require('express');
const router = express.Router();
const examsController = require('./exams.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const db = require('../../config/database');
const logger = require('../../utils/logger');

// All routes require authentication
router.use(authenticate);

// Rate Limit trackers (in memory)
let lastSyncTime = 0;
let lastRestoreTime = 0;
const COOLDOWN_MS = 60 * 1000; // 1 min

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

    if (Date.now() - lastSyncTime < COOLDOWN_MS) {
      return errorResponse(res, 429, 'Please wait 1 minute between backups to prevent GitHub rate limits.');
    }
    lastSyncTime = Date.now();

    // Export data from SQLite (include all fields so restore doesn't break constraints)
    const students = db.prepare(`SELECT * FROM users WHERE role = 'STUDENT'`).all();
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
 * @route   POST /api/exams/restore-from-github
 * @desc    Fetch CSV from GitHub and overwrite local SQLite state
 * @access  Private/Admin
 */
router.post('/restore-from-github', authorize('ADMIN'), async (req, res) => {
  try {
    const githubService = require('../../services/githubService');

    if (!githubService.isConfigured()) {
      return errorResponse(res, 400, 'GitHub sync is not configured.');
    }

    if (Date.now() - lastRestoreTime < COOLDOWN_MS) {
      return errorResponse(res, 429, 'Please wait 1 minute between restores to prevent GitHub rate limits.');
    }
    lastRestoreTime = Date.now();

    const students = await githubService.readCsv('students');
    const exams = await githubService.readCsv('exams');
    const questions = await githubService.readCsv('questions');
    const attempts = await githubService.readCsv('attempts');

    if (!students || students.length === 0) {
      return errorResponse(res, 404, 'No valid backup found on GitHub.');
    }

    const transaction = db.transaction(() => {
      // Restore Students
      if (students.length > 0) {
        const stmt = db.prepare(`INSERT OR REPLACE INTO users (id, email, password, name, role, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const s of students) {
          stmt.run(s.id, s.email, s.password, s.name, s.role, s.must_change_password || 0, s.created_at || null, s.updated_at || null);
        }
      }

      // Restore Exams
      if (exams.length > 0) {
        const stmt = db.prepare(`INSERT OR REPLACE INTO exams (id, title, description, subject, duration_minutes, total_marks, negative_marks, passing_percentage, scheduled_start, scheduled_end, is_active, tab_switch_threshold, looking_away_threshold, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const e of exams) {
          stmt.run(e.id, e.title, e.description, e.subject, e.duration_minutes, e.total_marks, e.negative_marks || 0, e.passing_percentage || 0, e.scheduled_start || null, e.scheduled_end || null, e.is_active || 1, e.tab_switch_threshold || 5, e.looking_away_threshold || 5, e.created_by, e.created_at || null, e.updated_at || null);
        }
      }

      // Restore Questions
      if (questions.length > 0) {
        const stmt = db.prepare(`INSERT OR REPLACE INTO questions (id, exam_id, question_text, options, correct_option_index, marks, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        for (const q of questions) {
          stmt.run(q.id, q.exam_id, q.question_text, q.options, q.correct_option_index, q.marks || 1, q.image_url || null);
        }
      }

      // Restore Attempts
      if (attempts.length > 0) {
        const stmt = db.prepare(`INSERT OR REPLACE INTO attempt_history (id, user_id, exam_id, score, total_marks, is_pass, status, start_time, end_time, violations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const a of attempts) {
          stmt.run(a.id, a.user_id, a.exam_id, a.score || 0, a.total_marks || 0, a.is_pass || 0, a.status || 'COMPLETED', a.start_time || null, a.end_time || null, a.violations || null);
        }
      }
    });

    transaction();
    logger.info('Database restored successfully from CSV backups.');
    return apiResponse(res, 200, null, 'Database successfully restored from GitHub CSV backups.');
  } catch (error) {
    logger.error('Restore from GitHub failed:', error);
    return errorResponse(res, 500, 'Failed to restore database from backup', error.message);
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

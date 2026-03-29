const db = require('../config/database');
const attemptService = require('../modules/attempts/attempts.service');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class ScheduledTaskService {
  constructor() {
    this.intervals = [];
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    logger.info('Starting scheduled tasks...');

    // Check for exam auto-start (every minute)
    this.intervals.push(setInterval(() => this.checkExamStart(), 60 * 1000));

    // Check for exam auto-submit (every 30 seconds)
    this.intervals.push(setInterval(() => this.checkExamTimeout(), 30 * 1000));

    // Send exam reminders (every 5 minutes)
    this.intervals.push(setInterval(() => this.sendExamReminders(), 5 * 60 * 1000));

    // Cleanup stale sessions (every hour)
    this.intervals.push(setInterval(() => this.cleanupStaleSessions(), 60 * 60 * 1000));

    // Sync to GitHub (every 5 minutes)
    this.intervals.push(setInterval(() => this.syncToGitHub(), 5 * 60 * 1000));

    logger.info('All scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('All scheduled tasks stopped');
  }

  /**
   * Check for exams that should auto-start
   */
  async checkExamStart() {
    try {
      const now = new Date().toISOString();
      
      // Find exams that just became available
      const exams = db.prepare(`
        SELECT * FROM exams
        WHERE is_active = 1
          AND scheduled_start <= ?
          AND scheduled_end > ?
      `).all(now, now);

      for (const exam of exams) {
        logger.debug(`Exam "${exam.title}" is now available`);
        // Could send notification to students here
      }
    } catch (error) {
      logger.error('Error checking exam start:', error);
    }
  }

  /**
   * Check for exams that should auto-submit due to timeout
   */
  async checkExamTimeout() {
    try {
      const now = new Date();
      
      // Find sessions that have exceeded their duration
      const sessions = db.prepare(`
        SELECT es.*, e.duration_minutes
        FROM exam_sessions es
        JOIN exams e ON es.exam_id = e.id
        WHERE es.status = 'IN_PROGRESS'
          AND datetime(es.started_at, e.duration_minutes || ' minutes') < datetime('now')
      `).all();

      for (const session of sessions) {
        logger.info(`Auto-submitting exam session ${session.id} due to timeout`);
        
        try {
          await attemptService.autoSubmitExam(session.id, 'TIMEOUT');
          
          // Send result email
          await this.sendResultEmail(session.user_id, session.exam_id, session.id);
        } catch (error) {
          logger.error(`Failed to auto-submit session ${session.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking exam timeout:', error);
    }
  }

  /**
   * Send exam reminders for upcoming exams
   */
  async sendExamReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Find exams starting in the next hour that haven't been reminded
      const exams = db.prepare(`
        SELECT * FROM exams
        WHERE is_active = 1
          AND scheduled_start > ?
          AND scheduled_start <= ?
      `).all(now.toISOString(), oneHourFromNow.toISOString());

      for (const exam of exams) {
        // Get all students
        const students = db.prepare(`
          SELECT id, email, name FROM users WHERE role = 'STUDENT'
        `).all();

        for (const student of students) {
          // Check if reminder already sent
          const reminderSent = db.prepare(`
            SELECT 1 FROM attempt_history 
            WHERE user_id = ? AND exam_id = ?
          `).get(student.id, exam.id);

          if (!reminderSent) {
            await emailService.sendExamReminder(student.email, student.name, exam);
            logger.info(`Sent reminder to ${student.email} for exam ${exam.title}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error sending exam reminders:', error);
    }
  }

  /**
   * Cleanup stale sessions (no activity for 24 hours)
   */
  async cleanupStaleSessions() {
    try {
      const staleSessions = db.prepare(`
        SELECT * FROM exam_sessions
        WHERE status = 'IN_PROGRESS'
          AND last_activity_at < datetime('now', '-24 hours')
      `).all();

      for (const session of staleSessions) {
        logger.info(`Cleaning up stale session ${session.id}`);
        await attemptService.autoSubmitExam(session.id, 'STALE_SESSION');
      }

      if (staleSessions.length > 0) {
        logger.info(`Cleaned up ${staleSessions.length} stale sessions`);
      }
    } catch (error) {
      logger.error('Error cleaning up stale sessions:', error);
    }
  }

  /**
   * Sync data to GitHub (only runs if GitHub credentials are configured)
   */
  async syncToGitHub() {
    try {
      const githubService = require('./githubService');

      // Skip entirely if GitHub is not configured
      if (!githubService.isConfigured()) return;

      const excelService = require('./excelService');

      // Export data from SQLite
      const students = db.prepare(`
        SELECT id, email, name, role, created_at FROM users WHERE role = 'STUDENT'
      `).all();

      const exams = db.prepare(`
        SELECT * FROM exams
      `).all();

      const questions = db.prepare(`
        SELECT * FROM questions
      `).all();

      const attempts = db.prepare(`
        SELECT * FROM attempt_history
      `).all();

      // Sync to GitHub
      await githubService.batchSync({
        students,
        exams,
        questions,
        attempts
      });

      logger.debug('GitHub sync completed');
    } catch (error) {
      logger.error('Error syncing to GitHub:', error);
    }
  }

  /**
   * Send result email after exam submission
   */
  async sendResultEmail(userId, examId, sessionId) {
    try {
      const student = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId);
      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
      const session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(sessionId);

      if (!student || !exam || !session) return;

      const result = {
        score: session.score,
        total_marks: exam.total_marks,
        correct_count: session.correct_count,
        incorrect_count: session.attempted_count - session.correct_count,
        unattempted_count: session.total_questions - session.attempted_count,
        duration_taken: Math.floor((new Date(session.submitted_at) - new Date(session.started_at)) / 1000)
      };

      await emailService.sendExamResult(student.email, student.name, exam, result);
    } catch (error) {
      logger.error('Error sending result email:', error);
    }
  }
}

module.exports = new ScheduledTaskService();

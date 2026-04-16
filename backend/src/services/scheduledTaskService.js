const { query } = require('../config/database');
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

      const { rows: exams } = await query(
        `SELECT * FROM exams
         WHERE is_active = 1
           AND scheduled_start <= $1
           AND scheduled_end > $2`,
        [now, now]
      );

      for (const exam of exams) {
        logger.debug(`Exam "${exam.title}" is now available`);
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
      const { rows: sessions } = await query(
        `SELECT es.*, e.duration_minutes
         FROM exam_sessions es
         JOIN exams e ON es.exam_id = e.id
         WHERE es.status = 'IN_PROGRESS'
           AND es.started_at + (e.duration_minutes || ' minutes')::INTERVAL < NOW()`
      );

      for (const session of sessions) {
        logger.info(`Auto-submitting exam session ${session.id} due to timeout`);

        try {
          await attemptService.autoSubmitExam(session.id, 'TIMEOUT');
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

      const { rows: exams } = await query(
        `SELECT * FROM exams
         WHERE is_active = 1
           AND scheduled_start > $1
           AND scheduled_start <= $2`,
        [now.toISOString(), oneHourFromNow.toISOString()]
      );

      for (const exam of exams) {
        const { rows: students } = await query(
          `SELECT id, email, name FROM users WHERE role = 'STUDENT'`
        );

        for (const student of students) {
          const { rows: reminderRows } = await query(
            `SELECT 1 FROM attempt_history WHERE user_id = $1 AND exam_id = $2`,
            [student.id, exam.id]
          );

          if (!reminderRows[0]) {
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
      const { rows: staleSessions } = await query(
        `SELECT * FROM exam_sessions
         WHERE status = 'IN_PROGRESS'
           AND last_activity_at < NOW() - INTERVAL '24 hours'`
      );

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
   * Send result email after exam submission
   */
  async sendResultEmail(userId, examId, sessionId) {
    try {
      const { rows: userRows } = await query(
        'SELECT email, name FROM users WHERE id = $1',
        [userId]
      );
      const { rows: examRows } = await query(
        'SELECT * FROM exams WHERE id = $1',
        [examId]
      );
      const { rows: sessionRows } = await query(
        'SELECT * FROM exam_sessions WHERE id = $1',
        [sessionId]
      );

      const student = userRows[0];
      const exam = examRows[0];
      const session = sessionRows[0];

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

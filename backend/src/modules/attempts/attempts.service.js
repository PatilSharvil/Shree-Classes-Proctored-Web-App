const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class AttemptService {
  /**
   * Start a new exam attempt with transaction to prevent race conditions
   */
  startAttempt(userId, examId) {
    const sessionId = uuidv4();

    try {
      // Start transaction
      db.exec('BEGIN TRANSACTION');

      // Check if user already has an active attempt for this exam
      const existingAttempt = db.prepare(`
        SELECT * FROM exam_sessions
        WHERE user_id = ? AND exam_id = ? AND status = 'IN_PROGRESS'
      `).get(userId, examId);

      if (existingAttempt) {
        db.exec('ROLLBACK');
        throw new Error('You already have an active attempt for this exam.');
      }

      // Get question count
      const questionCount = db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE exam_id = ?'
      ).get(examId).count;

      if (questionCount === 0) {
        db.exec('ROLLBACK');
        throw new Error('This exam has no questions.');
      }

      // Create session
      db.prepare(`
        INSERT INTO exam_sessions (
          id, user_id, exam_id, total_questions, current_question_index
        ) VALUES (?, ?, ?, ?, 0)
      `).run(sessionId, userId, examId, questionCount);

      // Commit transaction
      db.exec('COMMIT');

      return this.getSessionById(sessionId);
    } catch (error) {
      // Rollback on any error
      try {
        db.exec('ROLLBACK');
      } catch (e) {
        // Ignore rollback errors
      }
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSessionById(sessionId) {
    const session = db.prepare(`
      SELECT es.*, e.title as exam_title, e.duration_minutes,
             e.total_marks, e.passing_percentage
      FROM exam_sessions es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = ?
    `).get(sessionId);

    if (!session) {
      throw new Error('Session not found.');
    }

    return session;
  }

  /**
   * Get active session for user and exam
   */
  getActiveSession(userId, examId) {
    return db.prepare(`
      SELECT es.*, e.title as exam_title, e.duration_minutes
      FROM exam_sessions es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.user_id = ? AND es.exam_id = ? AND es.status = 'IN_PROGRESS'
    `).get(userId, examId);
  }

  /**
   * Save response for a question with transaction to prevent race conditions
   */
  saveResponse(sessionId, questionId, selectedOption) {
    const session = this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Cannot save response. Exam session is not active.');
    }

    try {
      // Start transaction
      db.exec('BEGIN TRANSACTION');

      // Get question details
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
      if (!question) {
        db.exec('ROLLBACK');
        throw new Error('Question not found.');
      }

      // Check if response already exists
      const existingResponse = db.prepare(
        'SELECT * FROM responses WHERE session_id = ? AND question_id = ?'
      ).get(sessionId, questionId);

      const responseId = existingResponse ? existingResponse.id : uuidv4();
      const isCorrect = selectedOption === question.correct_option ? 1 : 0;
      const marksAwarded = isCorrect ? question.marks : (selectedOption ? -question.negative_marks : 0);

      if (existingResponse) {
        // Update existing response
        db.prepare(`
          UPDATE responses
          SET selected_option = ?, is_correct = ?, marks_awarded = ?, answered_at = datetime('now')
          WHERE id = ?
        `).run(selectedOption, isCorrect, marksAwarded, responseId);
      } else {
        // Insert new response
        db.prepare(`
          INSERT INTO responses (id, session_id, question_id, selected_option, is_correct, marks_awarded)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(responseId, sessionId, questionId, selectedOption, isCorrect, marksAwarded);
      }

      // Update session stats
      this.updateSessionStats(sessionId);

      // Commit transaction
      db.exec('COMMIT');

      return {
        questionId,
        selectedOption,
        isCorrect: !!isCorrect,
        marksAwarded
      };
    } catch (error) {
      // Rollback on any error
      try {
        db.exec('ROLLBACK');
      } catch (e) {
        // Ignore rollback errors
      }
      throw error;
    }
  }

  /**
   * Update session statistics
   */
  updateSessionStats(sessionId) {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as attempted_count,
        COALESCE(SUM(is_correct), 0) as correct_count,
        COALESCE(SUM(marks_awarded), 0) as score
      FROM responses
      WHERE session_id = ?
    `).get(sessionId);

    db.prepare(`
      UPDATE exam_sessions 
      SET attempted_count = ?, correct_count = ?, score = ?, last_activity_at = datetime('now')
      WHERE id = ?
    `).run(stats.attempted_count, stats.correct_count, stats.score || 0, sessionId);
  }

  /**
   * Update current question index
   */
  updateCurrentQuestion(sessionId, index) {
    const session = this.getSessionById(sessionId);
    
    if (index < 0 || index >= session.total_questions) {
      throw new Error('Invalid question index.');
    }

    db.prepare(`
      UPDATE exam_sessions 
      SET current_question_index = ?, last_activity_at = datetime('now')
      WHERE id = ?
    `).run(index, sessionId);

    return { current_question_index: index };
  }

  /**
   * Submit exam
   */
  submitExam(sessionId) {
    const session = this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Exam is not in progress.');
    }

    // Update session status
    db.prepare(`
      UPDATE exam_sessions 
      SET status = 'SUBMITTED', submitted_at = datetime('now'), last_activity_at = datetime('now')
      WHERE id = ?
    `).run(sessionId);

    // Get final stats
    const stats = this.getSessionById(sessionId);

    // Create attempt history record
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(session.exam_id);
    const percentage = exam.total_marks > 0 ? (stats.score / exam.total_marks) * 100 : 0;

    // Helper for safe date parsing
    const parseDate = (d) => {
      if (!d) return new Date();
      // SQLite format is "YYYY-MM-DD HH:MM:SS", JS needs "YYYY-MM-DDTHH:MM:SS" or similar
      return new Date(d.replace(' ', 'T'));
    };

    const submittedDate = parseDate(stats.submitted_at);
    const startedDate = parseDate(session.started_at);
    const durationTaken = Math.floor((submittedDate - startedDate) / 1000);

    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO attempt_history (
        id, user_id, exam_id, session_id, score, total_marks, percentage,
        correct_count, incorrect_count, unattempted_count,
        duration_taken, started_at, submitted_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      session.user_id,
      session.exam_id,
      sessionId,
      stats.score || 0,
      exam.total_marks,
      percentage || 0,
      stats.correct_count || 0,
      (stats.attempted_count || 0) - (stats.correct_count || 0),
      Math.max(0, session.total_questions - (stats.attempted_count || 0)),
      isNaN(durationTaken) ? 0 : durationTaken,
      session.started_at,
      stats.submitted_at,
      'SUBMITTED'
    );

    return {
      sessionId,
      score: stats.score,
      totalMarks: exam.total_marks,
      percentage,
      correctCount: stats.correct_count,
      incorrectCount: stats.attempted_count - stats.correct_count,
      unattemptedCount: session.total_questions - stats.attempted_count
    };
  }

  /**
   * Auto-submit exam (timeout or proctoring violation)
   */
  autoSubmitExam(sessionId, reason = 'TIMEOUT') {
    const session = this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      return { message: 'Exam already submitted.' };
    }

    // Update session status
    db.prepare(`
      UPDATE exam_sessions 
      SET status = 'AUTO_SUBMITTED', submitted_at = datetime('now'), last_activity_at = datetime('now')
      WHERE id = ?
    `).run(sessionId);

    // Get final stats
    const stats = this.getSessionById(sessionId);
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(session.exam_id);
    const percentage = exam.total_marks > 0 ? (stats.score / exam.total_marks) * 100 : 0;

    // Helper for safe date parsing
    const parseDate = (d) => {
      if (!d) return new Date();
      return new Date(d.replace(' ', 'T'));
    };

    const submittedDate = parseDate(stats.submitted_at);
    const startedDate = parseDate(session.started_at);
    const durationTaken = Math.floor((submittedDate - startedDate) / 1000);

    // Create attempt history record
    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO attempt_history (
        id, user_id, exam_id, session_id, score, total_marks, percentage,
        correct_count, incorrect_count, unattempted_count,
        duration_taken, started_at, submitted_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      session.user_id,
      session.exam_id,
      sessionId,
      stats.score || 0,
      exam.total_marks,
      percentage || 0,
      stats.correct_count || 0,
      (stats.attempted_count || 0) - (stats.correct_count || 0),
      Math.max(0, session.total_questions - (stats.attempted_count || 0)),
      isNaN(durationTaken) ? 0 : durationTaken,
      session.started_at,
      stats.submitted_at,
      `AUTO_SUBMITTED_${reason}`
    );

    return {
      sessionId,
      reason,
      score: stats.score,
      totalMarks: exam.total_marks
    };
  }

  /**
   * Get user's attempt history
   */
  getAttemptHistory(userId, examId = null) {
    let query = `
      SELECT ah.*, e.title as exam_title
      FROM attempt_history ah
      JOIN exams e ON ah.exam_id = e.id
      WHERE ah.user_id = ?
    `;

    const params = [userId];

    if (examId) {
      query += ' AND ah.exam_id = ?';
      params.push(examId);
    }

    query += ' ORDER BY ah.submitted_at DESC';

    return db.prepare(query).all(...params);
  }

  /**
   * Get attempt details with responses
   */
  getAttemptDetails(sessionId) {
    const session = this.getSessionById(sessionId);
    
    const responses = db.prepare(`
      SELECT r.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
             q.image_url, q.option_a_image_url, q.option_b_image_url, q.option_c_image_url, q.option_d_image_url,
             q.explanation, q.explanation_image_url
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.session_id = ?
    `).all(sessionId);

    return {
      session,
      responses
    };
  }

  /**
   * Get all attempts for an exam (Admin)
   */
  getExamAttempts(examId) {
    return db.prepare(`
      SELECT ah.*, u.email, u.name
      FROM attempt_history ah
      JOIN users u ON ah.user_id = u.id
      WHERE ah.exam_id = ?
      ORDER BY ah.percentage DESC
    `).all(examId);
  }

  /**
   * Get stale sessions (for auto-submit)
   */
  getStaleSessions(timeoutMinutes = 30) {
    return db.prepare(`
      SELECT * FROM exam_sessions
      WHERE status = 'IN_PROGRESS'
        AND last_activity_at < datetime('now', ? || ' minutes')
    `).all(`-${timeoutMinutes}`);
  }
}

module.exports = new AttemptService();

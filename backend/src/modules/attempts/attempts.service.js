const { query, pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class AttemptService {
  /**
   * Start a new exam attempt (uses a DB transaction to prevent race conditions)
   */
  async startAttempt(userId, examId) {
    const sessionId = uuidv4();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already has an active attempt for this exam
      const { rows: existing } = await client.query(
        `SELECT * FROM exam_sessions WHERE user_id = $1 AND exam_id = $2 AND status = 'IN_PROGRESS'`,
        [userId, examId]
      );

      if (existing[0]) {
        await client.query('ROLLBACK');
        throw new Error('You already have an active attempt for this exam.');
      }

      // Get question count
      const { rows: countRows } = await client.query(
        'SELECT COUNT(*) as count FROM questions WHERE exam_id = $1',
        [examId]
      );
      const questionCount = parseInt(countRows[0].count, 10);

      if (questionCount === 0) {
        await client.query('ROLLBACK');
        throw new Error('This exam has no questions.');
      }

      // Create session
      await client.query(
        `INSERT INTO exam_sessions (id, user_id, exam_id, total_questions, current_question_index)
         VALUES ($1, $2, $3, $4, 0)`,
        [sessionId, userId, examId, questionCount]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.getSessionById(sessionId);
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId) {
    const { rows } = await query(
      `SELECT es.*, e.title as exam_title, e.duration_minutes,
              e.total_marks, e.passing_percentage
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.id = $1`,
      [sessionId]
    );
    const session = rows[0];

    if (!session) {
      throw new Error('Session not found.');
    }

    return session;
  }

  /**
   * Get active session for user and exam
   */
  async getActiveSession(userId, examId) {
    const { rows } = await query(
      `SELECT es.*, e.title as exam_title, e.duration_minutes
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.user_id = $1 AND es.exam_id = $2 AND es.status = 'IN_PROGRESS'`,
      [userId, examId]
    );
    return rows[0] || null;
  }

  /**
   * Save response for a question (uses a DB transaction)
   */
  async saveResponse(sessionId, questionId, selectedOption) {
    const session = await this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Cannot save response. Exam session is not active.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get question details
      const { rows: qRows } = await client.query(
        'SELECT * FROM questions WHERE id = $1',
        [questionId]
      );
      const question = qRows[0];
      if (!question) {
        await client.query('ROLLBACK');
        throw new Error('Question not found.');
      }

      // Check if response already exists
      const { rows: existingRows } = await client.query(
        'SELECT * FROM responses WHERE session_id = $1 AND question_id = $2',
        [sessionId, questionId]
      );
      const existingResponse = existingRows[0];

      const responseId = existingResponse ? existingResponse.id : uuidv4();
      const isCorrect = selectedOption === question.correct_option ? 1 : 0;
      const marksAwarded = isCorrect
        ? question.marks
        : (selectedOption ? -question.negative_marks : 0);

      if (existingResponse) {
        await client.query(
          `UPDATE responses
           SET selected_option = $1, is_correct = $2, marks_awarded = $3, answered_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [selectedOption, isCorrect, marksAwarded, responseId]
        );
      } else {
        await client.query(
          `INSERT INTO responses (id, session_id, question_id, selected_option, is_correct, marks_awarded)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [responseId, sessionId, questionId, selectedOption, isCorrect, marksAwarded]
        );
      }

      // Update session stats
      await this._updateSessionStats(client, sessionId);

      await client.query('COMMIT');

      return { questionId, selectedOption, isCorrect: !!isCorrect, marksAwarded };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update session statistics (internal helper — expects a transactional client)
   */
  async _updateSessionStats(client, sessionId) {
    const { rows } = await client.query(
      `SELECT COUNT(*) as attempted_count,
              COALESCE(SUM(is_correct), 0) as correct_count,
              COALESCE(SUM(marks_awarded), 0) as score
       FROM responses
       WHERE session_id = $1`,
      [sessionId]
    );
    const stats = rows[0];

    await client.query(
      `UPDATE exam_sessions
       SET attempted_count = $1, correct_count = $2, score = $3, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [stats.attempted_count, stats.correct_count, stats.score || 0, sessionId]
    );
  }

  /**
   * Update current question index
   */
  async updateCurrentQuestion(sessionId, index) {
    const session = await this.getSessionById(sessionId);

    if (index < 0 || index >= session.total_questions) {
      throw new Error('Invalid question index.');
    }

    await query(
      `UPDATE exam_sessions SET current_question_index = $1, last_activity_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [index, sessionId]
    );

    return { current_question_index: index };
  }

  /**
   * Submit exam
   */
  async submitExam(sessionId) {
    const session = await this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Exam is not in progress.');
    }

    await query(
      `UPDATE exam_sessions
       SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );

    const stats = await this.getSessionById(sessionId);
    const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [session.exam_id]);
    const exam = examRows[0];
    const percentage = exam.total_marks > 0 ? (stats.score / exam.total_marks) * 100 : 0;

    const submittedDate = new Date(stats.submitted_at);
    const startedDate = new Date(session.started_at);
    const durationTaken = Math.floor((submittedDate - startedDate) / 1000);

    const historyId = uuidv4();
    await query(
      `INSERT INTO attempt_history (
        id, user_id, exam_id, session_id, score, total_marks, percentage,
        correct_count, incorrect_count, unattempted_count,
        duration_taken, started_at, submitted_at, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
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
      ]
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
  async autoSubmitExam(sessionId, reason = 'TIMEOUT') {
    const session = await this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      return { message: 'Exam already submitted.' };
    }

    await query(
      `UPDATE exam_sessions
       SET status = 'AUTO_SUBMITTED', submitted_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );

    const stats = await this.getSessionById(sessionId);
    const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [session.exam_id]);
    const exam = examRows[0];
    const percentage = exam.total_marks > 0 ? (stats.score / exam.total_marks) * 100 : 0;

    const submittedDate = new Date(stats.submitted_at);
    const startedDate = new Date(session.started_at);
    const durationTaken = Math.floor((submittedDate - startedDate) / 1000);

    const historyId = uuidv4();
    await query(
      `INSERT INTO attempt_history (
        id, user_id, exam_id, session_id, score, total_marks, percentage,
        correct_count, incorrect_count, unattempted_count,
        duration_taken, started_at, submitted_at, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
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
      ]
    );

    return { sessionId, reason, score: stats.score, totalMarks: exam.total_marks };
  }

  /**
   * Get user's attempt history
   */
  async getAttemptHistory(userId, examId = null) {
    let sql = `
      SELECT ah.*, e.title as exam_title
      FROM attempt_history ah
      JOIN exams e ON ah.exam_id = e.id
      WHERE ah.user_id = $1
    `;
    const params = [userId];

    if (examId) {
      sql += ' AND ah.exam_id = $2';
      params.push(examId);
    }

    sql += ' ORDER BY ah.submitted_at DESC';

    const { rows } = await query(sql, params);
    return rows;
  }

  /**
   * Get attempt details with responses
   */
  async getAttemptDetails(sessionId) {
    const session = await this.getSessionById(sessionId);

    const { rows: responses } = await query(
      `SELECT r.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
              q.image_url, q.option_a_image_url, q.option_b_image_url, q.option_c_image_url, q.option_d_image_url,
              q.explanation, q.explanation_image_url
       FROM responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.session_id = $1`,
      [sessionId]
    );

    return { session, responses };
  }

  /**
   * Get all attempts for an exam (Admin)
   */
  async getExamAttempts(examId) {
    const { rows } = await query(
      `SELECT ah.*, u.email, u.name
       FROM attempt_history ah
       JOIN users u ON ah.user_id = u.id
       WHERE ah.exam_id = $1
       ORDER BY ah.percentage DESC`,
      [examId]
    );
    return rows;
  }

  /**
   * Get stale sessions (for auto-submit)
   */
  async getStaleSessions(timeoutMinutes = 30) {
    const { rows } = await query(
      `SELECT * FROM exam_sessions
       WHERE status = 'IN_PROGRESS'
         AND last_activity_at < NOW() - INTERVAL '${parseInt(timeoutMinutes, 10)} minutes'`
    );
    return rows;
  }
}

module.exports = new AttemptService();

const { query, pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const questionService = require('../questions/questions.service');

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
      
      // Handle shuffled options logic
      // We need to know what the "correct" letter is for THIS session
      const shuffledQuestion = questionService.shuffleOptions(question, sessionId);
      const shuffledCorrectOption = shuffledQuestion.correct_option;
      
      const isCorrect = selectedOption === shuffledCorrectOption ? 1 : 0;
      
      // Ensure marks are numbers
      const qMarks = parseFloat(question.marks) || 0;
      const qNegMarks = parseFloat(question.negative_marks) || 0;
      
      const marksAwarded = isCorrect
        ? qMarks
        : (selectedOption ? -qNegMarks : 0);

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
              COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0) as correct_count,
              COALESCE(SUM(marks_awarded), 0) as score
       FROM responses
       WHERE session_id = $1`,
      [sessionId]
    );
    const stats = rows[0];

    // node-pg returns bigint/numeric as strings, so we must parse them to numbers
    // to avoid type mismatch errors when updating INTEGER columns in CockroachDB/PostgreSQL
    const attemptedCount = parseInt(stats.attempted_count, 10) || 0;
    const correctCount = parseInt(stats.correct_count, 10) || 0;
    const totalScore = parseFloat(stats.score) || 0;

    await client.query(
      `UPDATE exam_sessions
       SET attempted_count = $1, correct_count = $2, score = $3, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [attemptedCount, correctCount, totalScore, sessionId]
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
  async submitExam(sessionId, providedResponses = null) {
    const session = await this.getSessionById(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Exam is not in progress.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If bulk responses are provided, save them first
      if (providedResponses && typeof providedResponses === 'object') {
        const questionIds = Object.keys(providedResponses);
        for (const qId of questionIds) {
          const selectedOption = providedResponses[qId];
          if (selectedOption === undefined || selectedOption === null) continue;

          // Get question for this specific response
          const { rows: qRows } = await client.query('SELECT * FROM questions WHERE id = $1', [qId]);
          const question = qRows[0];
          if (!question) continue;

          // Check for existing response
          const { rows: existingRows } = await client.query(
            'SELECT id FROM responses WHERE session_id = $1 AND question_id = $2',
            [sessionId, qId]
          );
          
          // Re-calculate correctness with deterministic shuffle
          const shuffledQuestion = questionService.shuffleOptions(question, sessionId);
          const isCorrect = selectedOption === shuffledQuestion.correct_option ? 1 : 0;
          const qMarks = parseFloat(question.marks) || 0;
          const qNegMarks = parseFloat(question.negative_marks) || 0;
          const marksAwarded = isCorrect ? qMarks : (selectedOption ? -qNegMarks : 0);

          if (existingRows[0]) {
            await client.query(
              `UPDATE responses SET selected_option = $1, is_correct = $2, marks_awarded = $3, answered_at = CURRENT_TIMESTAMP WHERE id = $4`,
              [selectedOption, isCorrect, marksAwarded, existingRows[0].id]
            );
          } else {
            await client.query(
              `INSERT INTO responses (id, session_id, question_id, selected_option, is_correct, marks_awarded) VALUES ($1, $2, $3, $4, $5, $6)`,
              [uuidv4(), sessionId, qId, selectedOption, isCorrect, marksAwarded]
            );
          }
        }
        
        // Update stats before final commit
        await this._updateSessionStats(client, sessionId);
      }

      await client.query(
        `UPDATE exam_sessions
         SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const stats = await this.getSessionById(sessionId);
    const { rows: examRows } = await query('SELECT * FROM exams WHERE id = $1', [session.exam_id]);
    const exam = examRows[0];

    // Use the actual sum of question marks rather than the admin-set total_marks,
    // because the admin-set value may not match (e.g. 5 questions × 2 marks = 10,
    // but admin typed 5). This prevents percentages > 100%.
    const { rows: marksRows } = await query(
      'SELECT COALESCE(SUM(marks), 0) AS actual_total FROM questions WHERE exam_id = $1',
      [session.exam_id]
    );
    const actualTotalMarks = parseFloat(marksRows[0].actual_total) || parseFloat(exam.total_marks) || 1;
    const rawPercentage = (parseFloat(stats.score) || 0) / actualTotalMarks * 100;
    // Cap at 100 and floor at 0
    const percentage = Math.min(100, Math.max(0, rawPercentage));

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
        actualTotalMarks,
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
      totalMarks: actualTotalMarks,
      percentage,
      correctCount: stats.correct_count,
      incorrectCount: (stats.attempted_count || 0) - (stats.correct_count || 0),
      unattemptedCount: session.total_questions - (stats.attempted_count || 0)
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

    // Use actual question marks sum (same fix as submitExam)
    const { rows: marksRows } = await query(
      'SELECT COALESCE(SUM(marks), 0) AS actual_total FROM questions WHERE exam_id = $1',
      [session.exam_id]
    );
    const actualTotalMarks = parseFloat(marksRows[0].actual_total) || parseFloat(exam.total_marks) || 1;
    const rawPercentage = (parseFloat(stats.score) || 0) / actualTotalMarks * 100;
    const percentage = Math.min(100, Math.max(0, rawPercentage));

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
        actualTotalMarks,
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

    return { sessionId, reason, score: stats.score, totalMarks: actualTotalMarks };
  }

  /**
   * Get user's attempt history
   */
  async getAttemptHistory(userId, examId = null) {
    let sql = `
      SELECT ah.*, e.title as exam_title,
             (SELECT COALESCE(SUM(marks), 0) FROM questions q WHERE q.exam_id = e.id) as actual_total
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
    
    // Dynamically calculate the accurate percentage based on actual_total instead of stored total_marks
    const fixedRows = rows.map(r => {
      const actualTotalMarks = parseFloat(r.actual_total) > 0 ? parseFloat(r.actual_total) : (parseFloat(r.total_marks) || 1);
      const rawPct = (parseFloat(r.score) || 0) / actualTotalMarks * 100;
      return {
        ...r,
        total_marks: actualTotalMarks,
        percentage: Math.min(100, Math.max(0, rawPct))
      };
    });

    return fixedRows;
  }

  /**
   * Get attempt details with responses.
   * Re-applies the same deterministic shuffle used during the exam so the
   * review page shows options in the exact order the student saw them.
   * This ensures selected_option and correct_option align with the displayed options.
   */
  async getAttemptDetails(sessionId) {
    const session = await this.getSessionById(sessionId);

    // Get actual sum of marks to fix old corrupted sessions correctly
    const { rows: marksRows } = await query(
      'SELECT COALESCE(SUM(marks), 0) AS actual_total FROM questions WHERE exam_id = $1',
      [session.exam_id]
    );
    const actualTotalMarks = parseFloat(marksRows[0].actual_total) > 0 ? parseFloat(marksRows[0].actual_total) : (parseFloat(session.total_marks) || 1);
    const rawPct = (parseFloat(session.score) || 0) / actualTotalMarks * 100;
    
    // Override the session fields with the accurate calculation before sending to frontend
    session.total_marks = actualTotalMarks;
    session.percentage = Math.min(100, Math.max(0, rawPct));

    const { rows: responses } = await query(
      `SELECT r.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
              q.question_type, q.image_url,
              q.option_a_image_url, q.option_b_image_url, q.option_c_image_url, q.option_d_image_url,
              q.explanation, q.explanation_image_url
       FROM responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.session_id = $1`,
      [sessionId]
    );

    // Re-shuffle options using the same seed (sessionId) that was used during the exam.
    // This makes option_a/b/c/d in the response match exactly what the student saw,
    // so the frontend can correctly highlight selected_option and correct_option.
    const reshuffled = responses.map((row) => {
      // Build a synthetic question object that shuffleOptions() can consume
      const question = {
        id: row.question_id,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        correct_option: row.correct_option,
        option_a_image_url: row.option_a_image_url,
        option_b_image_url: row.option_b_image_url,
        option_c_image_url: row.option_c_image_url,
        option_d_image_url: row.option_d_image_url,
      };

      const shuffled = questionService.shuffleOptions(question, sessionId);

      return {
        ...row,
        // Overwrite with shuffled option texts (the order the student saw)
        option_a: shuffled.option_a,
        option_b: shuffled.option_b,
        option_c: shuffled.option_c,
        option_d: shuffled.option_d,
        option_a_image_url: shuffled.option_a_image_url,
        option_b_image_url: shuffled.option_b_image_url,
        option_c_image_url: shuffled.option_c_image_url,
        option_d_image_url: shuffled.option_d_image_url,
        // correct_option is already stored in the responses table as the shuffled key,
        // but the joined q.correct_option is the original DB key — replace it with
        // the shuffled correct key so the review highlights the right option.
        correct_option: shuffled.correct_option,
      };
    });

    return { session, responses: reshuffled };
  }

  /**
   * Get all attempts for an exam (Admin)
   */
  async getExamAttempts(examId) {
    const { rows } = await query(
      `SELECT ah.*, u.email, u.name,
              (SELECT COALESCE(SUM(marks), 0) FROM questions q WHERE q.exam_id = ah.exam_id) as actual_total
       FROM attempt_history ah
       JOIN users u ON ah.user_id = u.id
       WHERE ah.exam_id = $1
       ORDER BY ah.percentage DESC`,
      [examId]
    );
    
    // Dynamically calculate the accurate percentage based on actual_total instead of stored total_marks
    const fixedRows = rows.map(r => {
      const actualTotalMarks = parseFloat(r.actual_total) > 0 ? parseFloat(r.actual_total) : (parseFloat(r.total_marks) || 1);
      const rawPct = (parseFloat(r.score) || 0) / actualTotalMarks * 100;
      return {
        ...r,
        total_marks: actualTotalMarks,
        percentage: Math.min(100, Math.max(0, rawPct))
      };
    });

    return fixedRows;
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

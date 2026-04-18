const { query } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class ExamService {
  /**
   * Create a new exam
   */
  async createExam(examData, createdBy) {
    const examId = uuidv4();

    await query(
      `INSERT INTO exams (
        id, title, description, subject, duration_minutes, total_marks,
        negative_marks, passing_percentage, scheduled_start, scheduled_end,
        is_active, tab_switch_threshold, looking_away_threshold, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        examId,
        examData.title,
        examData.description,
        examData.subject,
        examData.duration_minutes,
        examData.total_marks,
        examData.negative_marks || 0,
        examData.passing_percentage || 0,
        examData.scheduled_start || null,
        examData.scheduled_end || null,
        examData.is_active !== false ? 1 : 0,
        examData.tab_switch_threshold || 5,
        examData.looking_away_threshold || 5,
        createdBy
      ]
    );

    return this.getExamById(examId);
  }

  /**
   * Get exam by ID
   */
  async getExamById(id) {
    const { rows } = await query(
      `SELECT e.*, u.email as created_by_email,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
       FROM exams e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );
    const exam = rows[0];

    if (!exam) {
      throw new Error('Exam not found.');
    }

    return exam;
  }

  /**
   * Get all exams with optional filters
   */
  async getAllExams(filters = {}) {
    let sql = `
      SELECT e.*, u.email as created_by_email,
             (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
      FROM exams e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (filters.is_active !== undefined) {
      sql += ` AND e.is_active = $${idx++}`;
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.subject) {
      sql += ` AND e.subject = $${idx++}`;
      params.push(filters.subject);
    }

    if (filters.created_by) {
      sql += ` AND e.created_by = $${idx++}`;
      params.push(filters.created_by);
    }

    sql += ' ORDER BY e.created_at DESC';

    const { rows } = await query(sql, params);
    return rows;
  }

  /**
   * Get active exams (currently available)
   */
  async getActiveExams() {
    const now = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

    const { rows } = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
       FROM exams e
       WHERE e.is_active = 1
         AND (e.scheduled_start IS NULL OR substring(e.scheduled_start, 1, 16) <= $1)
         AND (e.scheduled_end IS NULL OR substring(e.scheduled_end, 1, 16) > $2)
       ORDER BY e.created_at DESC`,
      [now, now]
    );
    return rows;
  }

  /**
   * Update exam
   */
  async updateExam(id, examData) {
    await this.getExamById(id); // ensure exists

    const updateFields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'title', 'description', 'subject', 'duration_minutes', 'total_marks',
      'negative_marks', 'passing_percentage', 'scheduled_start', 'scheduled_end',
      'is_active', 'tab_switch_threshold', 'looking_away_threshold'
    ];

    for (const field of allowedFields) {
      if (examData[field] !== undefined) {
        updateFields.push(`${field} = $${idx++}`);
        if (field === 'scheduled_start' || field === 'scheduled_end') {
          values.push(examData[field] || null);
        } else if (field === 'is_active') {
          values.push(examData[field] ? 1 : 0);
        } else {
          values.push(examData[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update.');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await query(
      `UPDATE exams SET ${updateFields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getExamById(id);
  }

  /**
   * Delete exam
   */
  async deleteExam(id) {
    await this.getExamById(id); // ensure exists

    // Delete in correct order to avoid FK violations
    await query(
      'DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1)',
      [id]
    );
    await query(
      'DELETE FROM violations WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1)',
      [id]
    );
    await query(
      'DELETE FROM proctoring_logs WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1)',
      [id]
    );
    await query('DELETE FROM exam_sessions WHERE exam_id = $1', [id]);
    await query('DELETE FROM attempt_history WHERE exam_id = $1', [id]);
    // Questions cascade via ON DELETE CASCADE
    await query('DELETE FROM exams WHERE id = $1', [id]);

    return { message: 'Exam deleted successfully.' };
  }

  /**
   * Check if exam is currently available
   */
  async isExamAvailable(examId) {
    const exam = await this.getExamById(examId);

    if (!exam.is_active) {
      return { available: false, reason: 'Exam is not active.' };
    }

    if (!exam.scheduled_start && !exam.scheduled_end) {
      return { available: true };
    }

    const now = new Date().toISOString().slice(0, 16);
    const start = exam.scheduled_start ? exam.scheduled_start.slice(0, 16) : null;
    const end = exam.scheduled_end ? exam.scheduled_end.slice(0, 16) : null;

    if (start && start > now) {
      return { available: false, reason: 'Exam has not started yet.' };
    }

    if (end && end <= now) {
      return { available: false, reason: 'Exam has ended.' };
    }

    return { available: true };
  }

  /**
   * Get exam statistics
   */
  async getExamStats(examId) {
    const { rows: statsRows } = await query(
      `SELECT
        COUNT(DISTINCT ah.user_id) as total_attempts,
        AVG(ah.percentage) as avg_percentage,
        MAX(ah.percentage) as top_percentage,
        MIN(ah.percentage) as lowest_percentage,
        AVG(ah.duration_taken) as avg_duration
       FROM attempt_history ah
       WHERE ah.exam_id = $1`,
      [examId]
    );

    const { rows: diffRows } = await query(
      `SELECT difficulty, COUNT(*) as count
       FROM questions
       WHERE exam_id = $1
       GROUP BY difficulty`,
      [examId]
    );

    return {
      attempts: statsRows[0],
      questionDifficulty: diffRows
    };
  }
}

module.exports = new ExamService();

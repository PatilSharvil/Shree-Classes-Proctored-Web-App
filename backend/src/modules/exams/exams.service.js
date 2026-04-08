const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class ExamService {
  /**
   * Create a new exam
   */
  createExam(examData, createdBy) {
    const examId = uuidv4();

    db.prepare(`
      INSERT INTO exams (
        id, title, description, subject, duration_minutes, total_marks,
        negative_marks, passing_percentage, scheduled_start, scheduled_end,
        is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      examId,
      examData.title,
      examData.description,
      examData.subject,
      examData.duration_minutes,
      examData.total_marks,
      examData.negative_marks || 0,
      examData.passing_percentage || 0,
      examData.scheduled_start,
      examData.scheduled_end,
      examData.is_active !== false ? 1 : 0,
      createdBy
    );

    return this.getExamById(examId);
  }

  /**
   * Get exam by ID
   */
  getExamById(id) {
    const exam = db.prepare(`
      SELECT e.*, u.email as created_by_email
      FROM exams e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `).get(id);

    if (!exam) {
      throw new Error('Exam not found.');
    }

    return exam;
  }

  /**
   * Get all exams with optional filters
   */
  getAllExams(filters = {}) {
    let query = `
      SELECT e.*, u.email as created_by_email,
             (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
      FROM exams e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND e.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.subject) {
      query += ' AND e.subject = ?';
      params.push(filters.subject);
    }

    if (filters.created_by) {
      query += ' AND e.created_by = ?';
      params.push(filters.created_by);
    }

    query += ' ORDER BY e.created_at DESC';

    return db.prepare(query).all(...params);
  }

  /**
   * Get active exams (currently available)
   */
  getActiveExams() {
    // Use local time for comparison since scheduled_start/end are stored in local time
    const now = new Date().toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM

    return db.prepare(`
      SELECT e.*,
             (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
      FROM exams e
      WHERE e.is_active = 1
        AND (e.scheduled_start IS NULL OR substr(e.scheduled_start, 1, 16) <= ?)
        AND (e.scheduled_end IS NULL OR substr(e.scheduled_end, 1, 16) > ?)
      ORDER BY e.created_at DESC
    `).all(now, now);
  }

  /**
   * Update exam
   */
  updateExam(id, examData) {
    const exam = this.getExamById(id);

    const updateFields = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'subject', 'duration_minutes', 'total_marks',
      'negative_marks', 'passing_percentage', 'scheduled_start', 'scheduled_end', 'is_active'
    ];

    for (const field of allowedFields) {
      if (examData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        // Handle null/empty values for datetime fields
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

    updateFields.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE exams SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    return this.getExamById(id);
  }

  /**
   * Delete exam
   */
  deleteExam(id) {
    const exam = this.getExamById(id);
    
    // Delete related records in the correct order to avoid foreign key constraint violations
    const deleteResponses = db.prepare('DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
    deleteResponses.run(id);
    
    const deleteViolations = db.prepare('DELETE FROM violations WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
    deleteViolations.run(id);
    
    const deleteProctoringLogs = db.prepare('DELETE FROM proctoring_logs WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
    deleteProctoringLogs.run(id);
    
    const deleteSessions = db.prepare('DELETE FROM exam_sessions WHERE exam_id = ?');
    deleteSessions.run(id);
    
    const deleteAttemptHistory = db.prepare('DELETE FROM attempt_history WHERE exam_id = ?');
    deleteAttemptHistory.run(id);
    
    // Questions will be auto-deleted via ON DELETE CASCADE
    db.prepare('DELETE FROM exams WHERE id = ?').run(id);
    return { message: 'Exam deleted successfully.' };
  }

  /**
   * Check if exam is currently available
   */
  isExamAvailable(examId) {
    const exam = this.getExamById(examId);

    if (!exam.is_active) {
      return { available: false, reason: 'Exam is not active.' };
    }

    // If no scheduled times are set, exam is always available
    if (!exam.scheduled_start && !exam.scheduled_end) {
      return { available: true };
    }

    // Use local time for comparison since scheduled_start/end are stored in local time
    const now = new Date().toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
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
  getExamStats(examId) {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT ah.user_id) as total_attempts,
        AVG(ah.percentage) as avg_percentage,
        MAX(ah.percentage) as top_percentage,
        MIN(ah.percentage) as lowest_percentage,
        AVG(ah.duration_taken) as avg_duration
      FROM attempt_history ah
      WHERE ah.exam_id = ?
    `).get(examId);

    const questionStats = db.prepare(`
      SELECT 
        difficulty,
        COUNT(*) as count
      FROM questions
      WHERE exam_id = ?
      GROUP BY difficulty
    `).all(examId);

    return {
      attempts: stats,
      questionDifficulty: questionStats
    };
  }
}

module.exports = new ExamService();

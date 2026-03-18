const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');

class ProctoringService {
  /**
   * Record a violation
   */
  recordViolation(sessionId, type, description = null) {
    const violationId = uuidv4();

    db.prepare(`
      INSERT INTO violations (id, session_id, type, description)
      VALUES (?, ?, ?, ?)
    `).run(violationId, sessionId, type, description);

    // Update session violation count
    db.prepare(`
      UPDATE exam_sessions 
      SET violation_count = violation_count + 1, last_activity_at = datetime('now')
      WHERE id = ?
    `).run(sessionId);

    // Get updated violation count
    const session = db.prepare('SELECT violation_count FROM exam_sessions WHERE id = ?').get(sessionId);

    return {
      violationId,
      type,
      description,
      totalViolations: session.violation_count,
      threshold: env.proctorViolationThreshold,
      shouldAutoSubmit: env.proctorAutoSubmit && session.violation_count >= env.proctorViolationThreshold
    };
  }

  /**
   * Get violations for a session
   */
  getSessionViolations(sessionId) {
    return db.prepare(`
      SELECT * FROM violations
      WHERE session_id = ?
      ORDER BY timestamp DESC
    `).all(sessionId);
  }

  /**
   * Get session violation count
   */
  getViolationCount(sessionId) {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM violations WHERE session_id = ?'
    ).get(sessionId);
    return result.count;
  }

  /**
   * Check if session should be auto-submitted
   */
  shouldAutoSubmit(sessionId) {
    const count = this.getViolationCount(sessionId);
    return {
      shouldSubmit: env.proctorAutoSubmit && count >= env.proctorViolationThreshold,
      currentCount: count,
      threshold: env.proctorViolationThreshold
    };
  }

  /**
   * Get violation statistics for an exam
   */
  getExamViolationStats(examId) {
    return db.prepare(`
      SELECT 
        es.id as session_id,
        es.user_id,
        u.email,
        u.name,
        COUNT(v.id) as violation_count,
        MAX(es.status) as session_status
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN violations v ON v.session_id = es.id
      WHERE es.exam_id = ?
      GROUP BY es.id
      ORDER BY violation_count DESC
    `).all(examId);
  }

  /**
   * Get violation type breakdown
   */
  getViolationTypeBreakdown(examId = null) {
    let query = `
      SELECT 
        type,
        COUNT(*) as count
      FROM violations v
      JOIN exam_sessions es ON v.session_id = es.id
    `;

    if (examId) {
      query += ' WHERE es.exam_id = ?';
    }

    query += ' GROUP BY type';

    const params = examId ? [examId] : [];
    return db.prepare(query).all(...params);
  }

  /**
   * Clear violations for a session (Admin action)
   */
  clearViolations(sessionId) {
    db.prepare('DELETE FROM violations WHERE session_id = ?').run(sessionId);
    db.prepare('UPDATE exam_sessions SET violation_count = 0 WHERE id = ?').run(sessionId);
    return { message: 'Violations cleared for this session.' };
  }
}

module.exports = new ProctoringService();

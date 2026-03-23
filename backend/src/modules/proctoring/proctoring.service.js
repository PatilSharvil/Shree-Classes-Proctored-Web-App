const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');

class ProctoringService {
  /**
   * Record a violation with severity level
   */
  recordViolation(sessionId, type, description = null, severity = 'MEDIUM', metadata = null) {
    const violationId = uuidv4();

    // Define severity weights
    const severityWeights = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 5
    };

    db.prepare(`
      INSERT INTO violations (id, session_id, type, description, severity, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(violationId, sessionId, type, description, severity, metadata ? JSON.stringify(metadata) : null);

    // Update session violation count with weighted score
    const weight = severityWeights[severity] || 2;
    db.prepare(`
      UPDATE exam_sessions
      SET violation_count = violation_count + ?, last_activity_at = datetime('now')
      WHERE id = ?
    `).run(weight, sessionId);

    // Get updated violation count
    const session = db.prepare('SELECT violation_count FROM exam_sessions WHERE id = ?').get(sessionId);

    return {
      violationId,
      type,
      description,
      severity,
      totalViolations: session.violation_count,
      threshold: env.proctorViolationThreshold,
      shouldAutoSubmit: env.proctorAutoSubmit && session.violation_count >= env.proctorViolationThreshold
    };
  }

  /**
   * Log a proctoring event (detailed activity tracking)
   */
  logActivity(sessionId, eventType, eventData = null, isViolation = false, ipAddress = null, userAgent = null) {
    const logId = uuidv4();
    
    db.prepare(`
      INSERT INTO proctoring_logs (id, session_id, event_type, event_data, ip_address, user_agent, is_violation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, sessionId, eventType, eventData ? JSON.stringify(eventData) : null, ipAddress, userAgent, isViolation ? 1 : 0);

    // Update last activity timestamp
    db.prepare(`
      UPDATE exam_sessions
      SET last_activity_at = datetime('now')
      WHERE id = ?
    `).run(sessionId);

    return { logId, eventType, isViolation };
  }

  /**
   * Record violation with automatic activity logging
   */
  recordViolationWithLog(sessionId, type, description, severity, metadata = null, req = null) {
    // Record the violation
    const violationResult = this.recordViolation(sessionId, type, description, severity, metadata);
    
    // Log the activity
    this.logActivity(
      sessionId,
      `VIOLATION_${type}`,
      { description, severity, metadata },
      true,
      req?.ip,
      req?.get('user-agent')
    );

    return violationResult;
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
   * Get activity logs for a session
   */
  getSessionActivityLogs(sessionId, limit = 100) {
    return db.prepare(`
      SELECT * FROM proctoring_logs
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(sessionId, limit);
  }

  /**
   * Get violation count
   */
  getViolationCount(sessionId) {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM violations WHERE session_id = ?'
    ).get(sessionId);
    return result.count;
  }

  /**
   * Get weighted violation score
   */
  getWeightedViolationScore(sessionId) {
    const session = db.prepare('SELECT violation_count FROM exam_sessions WHERE id = ?').get(sessionId);
    return session ? session.violation_count : 0;
  }

  /**
   * Check if session should be auto-submitted
   */
  shouldAutoSubmit(sessionId) {
    const score = this.getWeightedViolationScore(sessionId);
    return {
      shouldSubmit: env.proctorAutoSubmit && score >= env.proctorViolationThreshold,
      currentScore: score,
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
        es.violation_count as weighted_score,
        MAX(es.status) as session_status,
        es.started_at,
        es.submitted_at
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN violations v ON v.session_id = es.id
      WHERE es.exam_id = ?
      GROUP BY es.id
      ORDER BY weighted_score DESC
    `).all(examId);
  }

  /**
   * Get violation type breakdown
   */
  getViolationTypeBreakdown(examId = null) {
    let query = `
      SELECT
        type,
        severity,
        COUNT(*) as count
      FROM violations v
      JOIN exam_sessions es ON v.session_id = es.id
    `;

    if (examId) {
      query += ' WHERE es.exam_id = ?';
    }

    query += ' GROUP BY type, severity ORDER BY count DESC';

    const params = examId ? [examId] : [];
    return db.prepare(query).all(...params);
  }

  /**
   * Get activity summary for exam (admin dashboard)
   */
  getExamActivitySummary(examId) {
    return db.prepare(`
      SELECT
        es.id as session_id,
        u.name,
        u.email,
        es.status,
        es.violation_count as weighted_score,
        COUNT(pl.id) as total_events,
        COUNT(CASE WHEN pl.is_violation = 1 THEN 1 END) as violation_events,
        MAX(pl.timestamp) as last_activity
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN proctoring_logs pl ON pl.session_id = es.id
      WHERE es.exam_id = ?
      GROUP BY es.id
      ORDER BY es.violation_count DESC
    `).all(examId);
  }

  /**
   * Get detailed activity timeline for a session
   */
  getSessionActivityTimeline(sessionId) {
    return db.prepare(`
      SELECT
        event_type,
        event_data,
        is_violation,
        timestamp,
        ip_address
      FROM proctoring_logs
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `).all(sessionId);
  }

  /**
   * Get live active sessions with recent activity
   */
  getLiveActiveSessions(examId) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    return db.prepare(`
      SELECT
        es.id as session_id,
        es.user_id,
        u.name,
        u.email,
        es.started_at,
        es.violation_count as weighted_score,
        es.status,
        COUNT(pl.id) as recent_events,
        COUNT(CASE WHEN pl.is_violation = 1 THEN 1 END) as recent_violations,
        MAX(pl.timestamp) as last_activity
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      LEFT JOIN proctoring_logs pl ON pl.session_id = es.id AND pl.timestamp > ?
      WHERE es.exam_id = ? AND es.status IN ('IN_PROGRESS', 'PAUSED')
      GROUP BY es.id
      ORDER BY recent_violations DESC, last_activity ASC
    `).all(thirtyMinutesAgo, examId);
  }

  /**
   * Get common violation patterns across all exams
   */
  getViolationPatterns() {
    return db.prepare(`
      SELECT
        type,
        severity,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as affected_sessions
      FROM violations
      GROUP BY type, severity
      ORDER BY count DESC
    `).all();
  }

  /**
   * Clear violations for a session (Admin action)
   */
  clearViolations(sessionId) {
    db.prepare('DELETE FROM violations WHERE session_id = ?').run(sessionId);
    db.prepare('UPDATE exam_sessions SET violation_count = 0 WHERE id = ?').run(sessionId);
    return { message: 'Violations cleared for this session.' };
  }

  /**
   * Export proctoring report for an exam
   */
  exportProctoringReport(examId) {
    const sessions = this.getExamActivitySummary(examId);
    
    return sessions.map(session => ({
      sessionId: session.session_id,
      studentName: session.name,
      studentEmail: session.email,
      status: session.status,
      weightedViolationScore: session.weighted_score,
      totalEvents: session.total_events,
      violationEvents: session.violation_events,
      lastActivity: session.last_activity
    }));
  }
}

module.exports = new ProctoringService();

const { query } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');
const snapshotFileManager = require('../../utils/snapshotFileManager');
const logger = require('../../utils/logger');

class ProctoringService {
  /**
   * Record a violation with severity level
   */
  async recordViolation(sessionId, type, description = null, severity = 'MEDIUM', metadata = null) {
    const violationId = uuidv4();

    const severityWeights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 };

    await query(
      `INSERT INTO violations (id, session_id, type, description, severity, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [violationId, sessionId, type, description, severity, metadata ? JSON.stringify(metadata) : null]
    );

    const weight = severityWeights[severity] || 2;
    await query(
      `UPDATE exam_sessions
       SET violation_count = violation_count + $1, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [weight, sessionId]
    );

    const { rows } = await query(
      'SELECT violation_count FROM exam_sessions WHERE id = $1',
      [sessionId]
    );
    const session = rows[0];

    return {
      violationId,
      type,
      description,
      severity,
      totalViolations: session ? session.violation_count : 0,
      threshold: env.proctorViolationThreshold,
      shouldAutoSubmit: env.proctorAutoSubmit && session && session.violation_count >= env.proctorViolationThreshold
    };
  }

  /**
   * Log a proctoring event (detailed activity tracking)
   */
  async logActivity(sessionId, eventType, eventData = null, isViolation = false, ipAddress = null, userAgent = null) {
    const logId = uuidv4();

    await query(
      `INSERT INTO proctoring_logs (id, session_id, event_type, event_data, ip_address, user_agent, is_violation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [logId, sessionId, eventType, eventData ? JSON.stringify(eventData) : null, ipAddress, userAgent, isViolation ? 1 : 0]
    );

    await query(
      `UPDATE exam_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [sessionId]
    );

    return { logId, eventType, isViolation };
  }

  /**
   * Record violation with automatic activity logging
   */
  async recordViolationWithLog(sessionId, type, description, severity, metadata = null, req = null) {
    const violationResult = await this.recordViolation(sessionId, type, description, severity, metadata);

    await this.logActivity(
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
  async getSessionViolations(sessionId) {
    const { rows } = await query(
      `SELECT * FROM violations WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );
    return rows;
  }

  /**
   * Get activity logs for a session
   */
  async getSessionActivityLogs(sessionId, limit = 100) {
    const { rows } = await query(
      `SELECT * FROM proctoring_logs WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2`,
      [sessionId, limit]
    );
    return rows;
  }

  /**
   * Get violation count
   */
  async getViolationCount(sessionId) {
    const { rows } = await query(
      'SELECT COUNT(*) as count FROM violations WHERE session_id = $1',
      [sessionId]
    );
    return parseInt(rows[0].count, 10);
  }

  /**
   * Get weighted violation score
   */
  async getWeightedViolationScore(sessionId) {
    const { rows } = await query(
      'SELECT violation_count FROM exam_sessions WHERE id = $1',
      [sessionId]
    );
    return rows[0] ? rows[0].violation_count : 0;
  }

  /**
   * Check if session should be auto-submitted
   */
  async shouldAutoSubmit(sessionId) {
    const score = await this.getWeightedViolationScore(sessionId);
    return {
      shouldSubmit: env.proctorAutoSubmit && score >= env.proctorViolationThreshold,
      currentScore: score,
      threshold: env.proctorViolationThreshold
    };
  }

  /**
   * Get violation statistics for an exam
   */
  async getExamViolationStats(examId) {
    const { rows } = await query(
      `SELECT
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
       WHERE es.exam_id = $1
       GROUP BY es.id, es.user_id, u.email, u.name, es.violation_count, es.started_at, es.submitted_at
       ORDER BY weighted_score DESC`,
      [examId]
    );
    return rows;
  }

  /**
   * Get violation type breakdown
   */
  async getViolationTypeBreakdown(examId = null) {
    let sql = `
      SELECT type, severity, COUNT(*) as count
      FROM violations v
      JOIN exam_sessions es ON v.session_id = es.id
    `;
    const params = [];

    if (examId) {
      sql += ' WHERE es.exam_id = $1';
      params.push(examId);
    }

    sql += ' GROUP BY type, severity ORDER BY count DESC';

    const { rows } = await query(sql, params);
    return rows;
  }

  /**
   * Get cheating detection data for a specific student session
   */
  async getStudentCheatingData(sessionId) {
    const { rows: violations } = await query(
      `SELECT
        v.id, v.type, v.description, v.severity, v.confidence_score,
        v.timestamp, v.metadata,
        ps.file_path, ps.file_size, ps.detection_type,
        ps.confidence as detection_confidence
       FROM violations v
       LEFT JOIN proctoring_snapshots ps ON v.id = ps.violation_id
       WHERE v.session_id = $1
       ORDER BY v.timestamp ASC`,
      [sessionId]
    );

    const { rows: sessionRows } = await query(
      `SELECT
        es.id as session_id, es.user_id, es.started_at, es.submitted_at,
        es.status, es.violation_count as weighted_score,
        u.name, u.email
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       WHERE es.id = $1`,
      [sessionId]
    );
    const session = sessionRows[0];

    if (!session) {
      throw new Error('Session not found');
    }

    const aiViolations = violations.filter(v => {
      try {
        const meta = v.metadata ? JSON.parse(v.metadata) : {};
        return meta.ai_detection === true;
      } catch (e) {
        return false;
      }
    });

    const lookingAwayViolations = aiViolations.filter(v => v.type === 'LOOKING_AWAY');
    const noFaceViolations = aiViolations.filter(v => v.type === 'NO_FACE');
    const tabSwitchViolations = aiViolations.filter(v =>
      v.type === 'TAB_SWITCH' || v.type === 'RAPID_TAB_SWITCH'
    );

    const totalAIViolations = aiViolations.length;
    const maxConfidence = aiViolations.length > 0
      ? Math.max(...aiViolations.map(v => v.confidence_score || 0))
      : 0;

    let cheatingRisk = 'LOW';
    let riskScore = 0;
    riskScore += lookingAwayViolations.length * 2;
    riskScore += noFaceViolations.length * 3;
    riskScore += maxConfidence * 10;

    if (riskScore >= 50) cheatingRisk = 'CRITICAL';
    else if (riskScore >= 30) cheatingRisk = 'HIGH';
    else if (riskScore >= 15) cheatingRisk = 'MEDIUM';

    return {
      session, violations, aiViolations, lookingAwayViolations,
      noFaceViolations, tabSwitchViolations,
      tabSwitchCount: tabSwitchViolations.length,
      totalAIViolations, maxConfidence, cheatingRisk, riskScore
    };
  }

  /**
   * Get cheating detection summary for all students in an exam
   */
  async getExamCheatingSummary(examId) {
    const { rows: sessions } = await query(
      `SELECT
        es.id as session_id, es.user_id, u.name, u.email,
        es.status, es.violation_count as weighted_score,
        es.started_at, es.submitted_at
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       WHERE es.exam_id = $1
       ORDER BY es.violation_count DESC`,
      [examId]
    );

    const results = [];
    for (const session of sessions) {
      const cheatingData = await this.getStudentCheatingData(session.session_id);
      const tabSwitchViolations = cheatingData.violations.filter(v =>
        v.type === 'TAB_SWITCH' || v.type === 'RAPID_TAB_SWITCH'
      );

      results.push({
        session_id: session.session_id,
        name: session.name,
        email: session.email,
        status: session.status,
        weighted_score: session.weighted_score,
        started_at: session.started_at,
        submitted_at: session.submitted_at,
        cheatingRisk: cheatingData.cheatingRisk,
        riskScore: cheatingData.riskScore,
        tabSwitchCount: tabSwitchViolations.length,
        totalAIViolations: cheatingData.totalAIViolations,
        lookingAwayCount: cheatingData.lookingAwayViolations.length,
        noFaceCount: cheatingData.noFaceViolations.length,
        maxConfidence: cheatingData.maxConfidence,
        violations: cheatingData.violations.slice(0, 10)
      });
    }
    return results;
  }

  /**
   * Get activity summary for exam (admin dashboard)
   */
  async getExamActivitySummary(examId) {
    const { rows } = await query(
      `SELECT
        es.id as session_id,
        u.name, u.email, es.status,
        es.violation_count as weighted_score,
        COUNT(pl.id) as total_events,
        COUNT(CASE WHEN pl.is_violation = 1 THEN 1 END) as violation_events,
        MAX(pl.timestamp) as last_activity
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       LEFT JOIN proctoring_logs pl ON pl.session_id = es.id
       WHERE es.exam_id = $1
       GROUP BY es.id, u.name, u.email, es.status, es.violation_count
       ORDER BY es.violation_count DESC`,
      [examId]
    );
    return rows;
  }

  /**
   * Get detailed activity timeline for a session
   */
  async getSessionActivityTimeline(sessionId) {
    const { rows } = await query(
      `SELECT event_type, event_data, is_violation, timestamp, ip_address
       FROM proctoring_logs WHERE session_id = $1 ORDER BY timestamp ASC`,
      [sessionId]
    );
    return rows;
  }

  /**
   * Get live active sessions with recent activity
   */
  async getLiveActiveSessions(examId) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { rows } = await query(
      `SELECT
        es.id as session_id, es.user_id, u.name, u.email,
        es.started_at, es.violation_count as weighted_score, es.status,
        COUNT(pl.id) as recent_events,
        COUNT(CASE WHEN pl.is_violation = 1 THEN 1 END) as recent_violations,
        MAX(pl.timestamp) as last_activity
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       LEFT JOIN proctoring_logs pl ON pl.session_id = es.id AND pl.timestamp > $1
       WHERE es.exam_id = $2 AND es.status IN ('IN_PROGRESS', 'PAUSED')
       GROUP BY es.id, es.user_id, u.name, u.email, es.started_at, es.violation_count, es.status
       ORDER BY recent_violations DESC, last_activity ASC`,
      [thirtyMinutesAgo, examId]
    );
    return rows;
  }

  /**
   * Get common violation patterns across all exams
   */
  async getViolationPatterns() {
    const { rows } = await query(
      `SELECT type, severity, COUNT(*) as count, COUNT(DISTINCT session_id) as affected_sessions
       FROM violations GROUP BY type, severity ORDER BY count DESC`
    );
    return rows;
  }

  /**
   * Clear violations for a session (Admin action)
   */
  async clearViolations(sessionId) {
    await query('DELETE FROM violations WHERE session_id = $1', [sessionId]);
    await query('UPDATE exam_sessions SET violation_count = 0 WHERE id = $1', [sessionId]);
    return { message: 'Violations cleared for this session.' };
  }

  /**
   * Export proctoring report for an exam
   */
  async exportProctoringReport(examId) {
    const sessions = await this.getExamActivitySummary(examId);

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

  /**
   * Save AI proctoring snapshot (evidence image)
   */
  async saveSnapshot(sessionId, imageData, detectionType, confidence, violationId = null, retentionDays = 7) {
    const snapshotId = uuidv4();

    const filePath = snapshotFileManager.generateFilePath(snapshotId, detectionType);
    const saveResult = snapshotFileManager.saveImage(imageData, filePath);

    if (!saveResult.success) {
      throw new Error(`Failed to save snapshot image: ${saveResult.error}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    await query(
      `INSERT INTO proctoring_snapshots (id, session_id, violation_id, file_path, file_size, detection_type, confidence, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [snapshotId, sessionId, violationId, filePath, saveResult.fileSize, detectionType, confidence, expiresAt.toISOString()]
    );

    if (violationId) {
      await query(
        `UPDATE violations SET snapshot_id = $1, confidence_score = $2 WHERE id = $3`,
        [snapshotId, confidence, violationId]
      );
    }

    logger.info(`[Proctoring] Snapshot saved: ${filePath} (${(saveResult.fileSize / 1024).toFixed(2)} KB)`);

    return {
      snapshotId, sessionId, violationId, detectionType,
      confidence, filePath, fileSize: saveResult.fileSize,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Get all snapshots for a session
   */
  async getSessionSnapshots(sessionId) {
    const { rows } = await query(
      `SELECT id, session_id, violation_id, detection_type, confidence, timestamp, expires_at
       FROM proctoring_snapshots WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );
    return rows;
  }

  /**
   * Get evidence gallery for an exam (all sessions)
   */
  async getExamEvidenceGallery(examId, options = {}) {
    const { limit = 50, detectionType = null, minConfidence = 0, includeImage = true } = options;

    let sql = `
      SELECT
        s.id as snapshot_id, s.session_id, s.violation_id, s.file_path,
        s.file_size, s.detection_type, s.confidence, s.timestamp,
        v.type as violation_type, v.description as violation_description, v.severity,
        es.user_id, u.name as student_name, u.email as student_email
      FROM proctoring_snapshots s
      INNER JOIN exam_sessions es ON s.session_id = es.id
      LEFT JOIN users u ON es.user_id = u.id
      LEFT JOIN violations v ON s.violation_id = v.id
      WHERE es.exam_id = $1 AND s.confidence >= $2
    `;

    const params = [examId, minConfidence];
    let idx = 3;

    if (detectionType) {
      sql += ` AND s.detection_type = $${idx++}`;
      params.push(detectionType);
    }

    sql += ` ORDER BY s.timestamp DESC LIMIT $${idx}`;
    params.push(limit);

    const { rows: snapshots } = await query(sql, params);

    return snapshots.map(snapshot => {
      const imageData = includeImage ? snapshotFileManager.readImage(snapshot.file_path) : null;
      return { ...snapshot, image_data: imageData, file_exists: imageData !== null };
    });
  }

  /**
   * Delete expired snapshots (cleanup job)
   */
  async cleanupExpiredSnapshots() {
    const now = new Date().toISOString();

    const { rows: expired } = await query(
      `SELECT id, file_path, file_size FROM proctoring_snapshots WHERE expires_at < $1`,
      [now]
    );

    if (expired.length === 0) {
      return { deleted: 0, freedSpace: 0, message: 'No expired snapshots to clean' };
    }

    const filePaths = expired.map(s => s.file_path);
    const cleanupResult = snapshotFileManager.cleanupExpired(filePaths);

    const { rowCount } = await query(
      `DELETE FROM proctoring_snapshots WHERE expires_at < $1`,
      [now]
    );

    const totalFreed = cleanupResult.freedSpace;
    logger.info(`[Proctoring] Cleanup: Deleted ${rowCount} snapshot records, freed ${(totalFreed / 1024 / 1024).toFixed(2)} MB`);

    return {
      deleted: rowCount,
      freedSpace: totalFreed,
      message: `Deleted ${rowCount} expired snapshots, freed ${(totalFreed / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Get active sessions for an exam (for WebSocket)
   */
  async getActiveSessionsForExam(examId) {
    const { rows } = await query(
      `SELECT
        es.id, es.user_id, u.name as user_name, u.email as user_email,
        es.started_at, es.violation_count, es.status, es.last_activity_at
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       WHERE es.exam_id = $1 AND es.status IN ('IN_PROGRESS', 'PAUSED')
       ORDER BY es.started_at DESC`,
      [examId]
    );
    return rows;
  }

  /**
   * Get session by ID with user details
   */
  async getSessionById(sessionId) {
    const { rows } = await query(
      `SELECT es.*, u.name as user_name, u.email as user_email
       FROM exam_sessions es
       JOIN users u ON es.user_id = u.id
       WHERE es.id = $1`,
      [sessionId]
    );
    return rows[0] || null;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const fileStats = snapshotFileManager.getStorageStats();

    const { rows } = await query(
      `SELECT COUNT(*) as total_records, SUM(file_size) as total_db_size FROM proctoring_snapshots`
    );
    const dbStats = rows[0];

    return {
      files: fileStats,
      database: {
        totalRecords: parseInt(dbStats.total_records, 10),
        totalSize: dbStats.total_db_size || 0,
        totalSizeMB: ((dbStats.total_db_size || 0) / 1024 / 1024).toFixed(2)
      }
    };
  }
}

module.exports = new ProctoringService();

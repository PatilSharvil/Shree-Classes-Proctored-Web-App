const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');
const snapshotFileManager = require('../../utils/snapshotFileManager');

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
   * Get cheating detection data for a specific student session
   * Returns detailed AI violation data with gaze tracking info
   */
  getStudentCheatingData(sessionId) {
    // Get all violations for this session with metadata
    const violations = db.prepare(`
      SELECT 
        v.id,
        v.type,
        v.description,
        v.severity,
        v.confidence_score,
        v.timestamp,
        v.metadata,
        ps.file_path,
        ps.file_size,
        ps.detection_type,
        ps.confidence as detection_confidence
      FROM violations v
      LEFT JOIN proctoring_snapshots ps ON v.id = ps.violation_id
      WHERE v.session_id = ?
      ORDER BY v.timestamp ASC
    `).all(sessionId);

    // Get session info
    const session = db.prepare(`
      SELECT 
        es.id as session_id,
        es.user_id,
        es.started_at,
        es.submitted_at,
        es.status,
        es.violation_count as weighted_score,
        u.name,
        u.email
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      WHERE es.id = ?
    `).get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate cheating risk score
    const aiViolations = violations.filter(v => {
      try {
        const meta = v.metadata ? JSON.parse(v.metadata) : {};
        return meta.ai_detection === true;
      } catch (e) {
        return false;
      }
    });
    
    const lookingAwayViolations = aiViolations.filter(v =>
      v.type === 'LOOKING_AWAY'
    );

    const noFaceViolations = aiViolations.filter(v =>
      v.type === 'NO_FACE'
    );

    const tabSwitchViolations = aiViolations.filter(v =>
      v.type === 'TAB_SWITCH' || v.type === 'RAPID_TAB_SWITCH'
    );

    const totalAIViolations = aiViolations.length;
    const maxConfidence = aiViolations.length > 0 
      ? Math.max(...aiViolations.map(v => v.confidence_score || 0))
      : 0;

    // Determine cheating risk level
    let cheatingRisk = 'LOW';
    let riskScore = 0;
    
    // Calculate risk based on violations
    riskScore += lookingAwayViolations.length * 2;
    riskScore += noFaceViolations.length * 3;
    riskScore += maxConfidence * 10;

    if (riskScore >= 50) {
      cheatingRisk = 'CRITICAL';
    } else if (riskScore >= 30) {
      cheatingRisk = 'HIGH';
    } else if (riskScore >= 15) {
      cheatingRisk = 'MEDIUM';
    } else {
      cheatingRisk = 'LOW';
    }

    return {
      session,
      violations,
      aiViolations,
      lookingAwayViolations,
      noFaceViolations,
      tabSwitchViolations,
      tabSwitchCount: tabSwitchViolations.length,
      totalAIViolations,
      maxConfidence,
      cheatingRisk,
      riskScore
    };
  }

  /**
   * Get cheating detection summary for all students in an exam
   */
  getExamCheatingSummary(examId) {
    // Get all sessions for this exam
    const sessions = db.prepare(`
      SELECT 
        es.id as session_id,
        es.user_id,
        u.name,
        u.email,
        es.status,
        es.violation_count as weighted_score,
        es.started_at,
        es.submitted_at
      FROM exam_sessions es
      JOIN users u ON es.user_id = u.id
      WHERE es.exam_id = ?
      ORDER BY es.violation_count DESC
    `).all(examId);

    // Get cheating data for each session
    return sessions.map(session => {
      const cheatingData = this.getStudentCheatingData(session.session_id);

      // Count tab switch violations
      const tabSwitchViolations = cheatingData.violations.filter(v =>
        v.type === 'TAB_SWITCH' || v.type === 'RAPID_TAB_SWITCH'
      );

      return {
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
        violations: cheatingData.violations.slice(0, 10) // Last 10 violations
      };
    });
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

  /**
   * Save AI proctoring snapshot (evidence image)
   * Images are stored as files on disk, database only stores file paths
   */
  saveSnapshot(sessionId, imageData, detectionType, confidence, violationId = null, retentionDays = 7) {
    const snapshotId = uuidv4();

    // Generate file path
    const filePath = snapshotFileManager.generateFilePath(snapshotId, detectionType);

    // Save image to file
    const saveResult = snapshotFileManager.saveImage(imageData, filePath);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save snapshot image: ${saveResult.error}`);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);
    const expiresAtStr = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    // Store file path and metadata in database (NOT the image data)
    db.prepare(`
      INSERT INTO proctoring_snapshots (id, session_id, violation_id, file_path, file_size, detection_type, confidence, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(snapshotId, sessionId, violationId, filePath, saveResult.fileSize, detectionType, confidence, expiresAtStr);

    // Update violation with snapshot reference if provided
    if (violationId) {
      db.prepare(`
        UPDATE violations SET snapshot_id = ?, confidence_score = ? WHERE id = ?
      `).run(snapshotId, confidence, violationId);
    }

    logger.info(`[Proctoring] Snapshot saved: ${filePath} (${(saveResult.fileSize / 1024).toFixed(2)} KB)`);

    return {
      snapshotId,
      sessionId,
      violationId,
      detectionType,
      confidence,
      filePath,
      fileSize: saveResult.fileSize,
      expiresAt: expiresAtStr
    };
  }

  /**
   * Get all snapshots for a session
   */
  getSessionSnapshots(sessionId) {
    return db.prepare(`
      SELECT id, session_id, violation_id, detection_type, confidence, timestamp, expires_at
      FROM proctoring_snapshots
      WHERE session_id = ?
      ORDER BY timestamp DESC
    `).all(sessionId);
  }

  /**
   * Get evidence gallery for an exam (all sessions)
   * Reads image files and includes them as base64 in response
   */
  getExamEvidenceGallery(examId, options = {}) {
    const { limit = 50, detectionType = null, minConfidence = 0, includeImage = true } = options;

    let query = `
      SELECT
        s.id as snapshot_id,
        s.session_id,
        s.violation_id,
        s.file_path,
        s.file_size,
        s.detection_type,
        s.confidence,
        s.timestamp,
        v.type as violation_type,
        v.description as violation_description,
        v.severity,
        es.user_id,
        u.name as student_name,
        u.email as student_email
      FROM proctoring_snapshots s
      INNER JOIN exam_sessions es ON s.session_id = es.id
      LEFT JOIN users u ON es.user_id = u.id
      LEFT JOIN violations v ON s.violation_id = v.id
      WHERE es.exam_id = ?
        AND s.confidence >= ?
    `;

    const params = [examId, minConfidence];

    if (detectionType) {
      query += ` AND s.detection_type = ?`;
      params.push(detectionType);
    }

    query += ` ORDER BY s.timestamp DESC LIMIT ?`;
    params.push(limit);

    const snapshots = db.prepare(query).all(...params);

    // Read image files and convert to base64 for frontend display
    return snapshots.map(snapshot => {
      const imageData = includeImage ? snapshotFileManager.readImage(snapshot.file_path) : null;
      
      return {
        ...snapshot,
        image_data: imageData,
        file_exists: imageData !== null
      };
    });
  }

  /**
   * Delete expired snapshots (cleanup job)
   * Deletes both database records and actual image files
   */
  cleanupExpiredSnapshots() {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Get expired snapshots
    const expired = db.prepare(`
      SELECT id, file_path, file_size FROM proctoring_snapshots WHERE expires_at < ?
    `).all(now);

    if (expired.length === 0) {
      return { deleted: 0, freedSpace: 0, message: 'No expired snapshots to clean' };
    }

    // Delete files first
    const filePaths = expired.map(s => s.file_path);
    const cleanupResult = snapshotFileManager.cleanupExpired(filePaths);

    // Then delete database records
    const result = db.prepare(`
      DELETE FROM proctoring_snapshots WHERE expires_at < ?
    `).run(now);

    const totalFreed = cleanupResult.freedSpace;
    
    logger.info(`[Proctoring] Cleanup: Deleted ${result.changes} snapshot records, freed ${(totalFreed / 1024 / 1024).toFixed(2)} MB`);

    return {
      deleted: result.changes,
      freedSpace: totalFreed,
      message: `Deleted ${result.changes} expired snapshots, freed ${(totalFreed / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const fileStats = snapshotFileManager.getStorageStats();
    
    const dbStats = db.prepare(`
      SELECT COUNT(*) as total_records, SUM(file_size) as total_db_size
      FROM proctoring_snapshots
    `).get();

    return {
      files: fileStats,
      database: {
        totalRecords: dbStats.total_records,
        totalSize: dbStats.total_db_size || 0,
        totalSizeMB: ((dbStats.total_db_size || 0) / 1024 / 1024).toFixed(2)
      }
    };
  }
}

module.exports = new ProctoringService();

const proctoringService = require('./proctoring.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Record a violation with automatic activity logging
 * POST /api/proctoring/violations
 */
const recordViolation = (req, res) => {
  try {
    const { sessionId, type, description, severity = 'MEDIUM', metadata } = req.body;

    if (!sessionId || !type) {
      return errorResponse(res, 400, 'Session ID and violation type are required.');
    }

    const result = proctoringService.recordViolationWithLog(
      sessionId,
      type,
      description,
      severity,
      metadata,
      req
    );

    return apiResponse(res, 201, result, 'Violation recorded');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to record violation.', error.message);
  }
};

/**
 * Log a proctoring activity event
 * POST /api/proctoring/log
 */
const logActivity = (req, res) => {
  try {
    const { sessionId, eventType, eventData, isViolation = false } = req.body;

    if (!sessionId || !eventType) {
      return errorResponse(res, 400, 'Session ID and event type are required.');
    }

    const result = proctoringService.logActivity(
      sessionId,
      eventType,
      eventData,
      isViolation,
      req.ip,
      req.get('user-agent')
    );

    return apiResponse(res, 201, result, 'Activity logged');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to log activity.', error.message);
  }
};

/**
 * Get violations for a session
 * GET /api/proctoring/violations/:sessionId
 */
const getSessionViolations = (req, res) => {
  try {
    const violations = proctoringService.getSessionViolations(req.params.sessionId);
    return apiResponse(res, 200, violations, 'Violations retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get violations.', error.message);
  }
};

/**
 * Get activity logs for a session
 * GET /api/proctoring/activity/:sessionId
 */
const getSessionActivityLogs = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = proctoringService.getSessionActivityLogs(req.params.sessionId, limit);
    return apiResponse(res, 200, logs, 'Activity logs retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get activity logs.', error.message);
  }
};

/**
 * Get activity timeline for a session
 * GET /api/proctoring/timeline/:sessionId
 */
const getSessionActivityTimeline = (req, res) => {
  try {
    const timeline = proctoringService.getSessionActivityTimeline(req.params.sessionId);
    return apiResponse(res, 200, timeline, 'Activity timeline retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get activity timeline.', error.message);
  }
};

/**
 * Check if should auto-submit
 * GET /api/proctoring/check-submit/:sessionId
 */
const checkAutoSubmit = (req, res) => {
  try {
    const result = proctoringService.shouldAutoSubmit(req.params.sessionId);
    return apiResponse(res, 200, result, result.shouldSubmit ? 'Threshold exceeded' : 'Within threshold');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to check auto-submit.', error.message);
  }
};

/**
 * Get weighted violation score
 * GET /api/proctoring/score/:sessionId
 */
const getViolationScore = (req, res) => {
  try {
    const score = proctoringService.getWeightedViolationScore(req.params.sessionId);
    return apiResponse(res, 200, { sessionId: req.params.sessionId, score }, 'Violation score retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get violation score.', error.message);
  }
};

/**
 * Get exam violation stats (Admin)
 * GET /api/proctoring/stats/:examId
 */
const getExamViolationStats = (req, res) => {
  try {
    const stats = proctoringService.getExamViolationStats(req.params.examId);
    return apiResponse(res, 200, stats, 'Exam violation stats retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get violation stats.', error.message);
  }
};

/**
 * Get exam activity summary (Admin)
 * GET /api/proctoring/summary/:examId
 */
const getExamActivitySummary = (req, res) => {
  try {
    const summary = proctoringService.getExamActivitySummary(req.params.examId);
    return apiResponse(res, 200, summary, 'Exam activity summary retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get activity summary.', error.message);
  }
};

/**
 * Get live active sessions for an exam (Admin)
 * GET /api/proctoring/live/:examId
 */
const getLiveActiveSessions = (req, res) => {
  try {
    const sessions = proctoringService.getLiveActiveSessions(req.params.examId);
    return apiResponse(res, 200, sessions, 'Live sessions retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get live sessions.', error.message);
  }
};

/**
 * Get violation type breakdown (Admin)
 * GET /api/proctoring/breakdown
 */
const getViolationTypeBreakdown = (req, res) => {
  try {
    const { examId } = req.query;
    const breakdown = proctoringService.getViolationTypeBreakdown(examId);
    return apiResponse(res, 200, breakdown, 'Violation breakdown retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get violation breakdown.', error.message);
  }
};

/**
 * Get violation patterns (Admin)
 * GET /api/proctoring/patterns
 */
const getViolationPatterns = (req, res) => {
  try {
    const patterns = proctoringService.getViolationPatterns();
    return apiResponse(res, 200, patterns, 'Violation patterns retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get violation patterns.', error.message);
  }
};

/**
 * Clear violations (Admin)
 * DELETE /api/proctoring/violations/:sessionId
 */
const clearViolations = (req, res) => {
  try {
    const result = proctoringService.clearViolations(req.params.sessionId);
    return apiResponse(res, 200, result, 'Violations cleared');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to clear violations.', error.message);
  }
};

/**
 * Export proctoring report (Admin)
 * GET /api/proctoring/export/:examId
 */
const exportProctoringReport = (req, res) => {
  try {
    const report = proctoringService.exportProctoringReport(req.params.examId);
    return apiResponse(res, 200, report, 'Proctoring report exported');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to export report.', error.message);
  }
};

module.exports = {
  recordViolation,
  logActivity,
  getSessionViolations,
  getSessionActivityLogs,
  getSessionActivityTimeline,
  checkAutoSubmit,
  getViolationScore,
  getExamViolationStats,
  getExamActivitySummary,
  getLiveActiveSessions,
  getViolationTypeBreakdown,
  getViolationPatterns,
  clearViolations,
  exportProctoringReport
};

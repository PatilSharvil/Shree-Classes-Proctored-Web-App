const proctoringService = require('./proctoring.service');
const attemptService = require('../attempts/attempts.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Record a violation
 * POST /api/proctoring/violations
 */
const recordViolation = (req, res) => {
  try {
    const { sessionId, type, description } = req.body;

    if (!sessionId || !type) {
      return errorResponse(res, 400, 'Session ID and violation type are required.');
    }

    const result = proctoringService.recordViolation(sessionId, type, description);
    
    return apiResponse(res, 201, result, 'Violation recorded');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to record violation.', error.message);
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

module.exports = {
  recordViolation,
  getSessionViolations,
  checkAutoSubmit,
  getExamViolationStats,
  getViolationTypeBreakdown,
  clearViolations
};

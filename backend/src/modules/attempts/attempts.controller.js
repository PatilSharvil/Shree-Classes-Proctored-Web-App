const attemptService = require('./attempts.service');
const examService = require('../exams/exams.service');
const questionService = require('../questions/questions.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Start exam attempt
 * POST /api/attempts/start
 */
const startAttempt = (req, res) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      return errorResponse(res, 400, 'Exam ID is required.');
    }

    // Check exam availability
    const availability = examService.isExamAvailable(examId);
    if (!availability.available) {
      return errorResponse(res, 400, availability.reason);
    }

    const session = attemptService.startAttempt(req.user.id, examId);
    return apiResponse(res, 201, session, 'Exam started successfully');
  } catch (error) {
    if (error.message.includes('already have an active attempt') || 
        error.message.includes('no questions')) {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to start exam.', error.message);
  }
};

/**
 * Get active session
 * GET /api/attempts/active/:examId
 */
const getActiveSession = (req, res) => {
  try {
    const session = attemptService.getActiveSession(req.user.id, req.params.examId);
    
    if (!session) {
      return errorResponse(res, 404, 'No active session found.');
    }

    return apiResponse(res, 200, session, 'Active session retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get active session.', error.message);
  }
};

/**
 * Save response
 * POST /api/attempts/:sessionId/respond
 */
const saveResponse = (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, selectedOption } = req.body;

    if (!questionId || selectedOption === undefined) {
      return errorResponse(res, 400, 'Question ID and selected option are required.');
    }

    const result = attemptService.saveResponse(sessionId, questionId, selectedOption);
    return apiResponse(res, 200, result, 'Response saved successfully');
  } catch (error) {
    if (error.message.includes('not active') || error.message.includes('not found')) {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to save response.', error.message);
  }
};

/**
 * Update current question
 * PUT /api/attempts/:sessionId/question
 */
const updateCurrentQuestion = (req, res) => {
  try {
    const { sessionId } = req.params;
    const { index } = req.body;

    if (index === undefined) {
      return errorResponse(res, 400, 'Question index is required.');
    }

    const result = attemptService.updateCurrentQuestion(sessionId, index);
    return apiResponse(res, 200, result, 'Question index updated');
  } catch (error) {
    if (error.message.includes('Invalid question index')) {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to update question.', error.message);
  }
};

/**
 * Submit exam
 * POST /api/attempts/:sessionId/submit
 */
const submitExam = (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = attemptService.submitExam(sessionId);
    return apiResponse(res, 200, result, 'Exam submitted successfully');
  } catch (error) {
    if (error.message.includes('not in progress')) {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to submit exam.', error.message);
  }
};

/**
 * Get attempt history
 * GET /api/attempts/history
 */
const getAttemptHistory = (req, res) => {
  try {
    const { examId } = req.query;
    const history = attemptService.getAttemptHistory(req.user.id, examId);
    return apiResponse(res, 200, history, 'Attempt history retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get attempt history.', error.message);
  }
};

/**
 * Get attempt details
 * GET /api/attempts/:sessionId/details
 */
const getAttemptDetails = (req, res) => {
  try {
    const details = attemptService.getAttemptDetails(req.params.sessionId);
    return apiResponse(res, 200, details, 'Attempt details retrieved');
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to get attempt details.', error.message);
  }
};

/**
 * Get exam attempts (Admin)
 * GET /api/attempts/exam/:examId
 */
const getExamAttempts = (req, res) => {
  try {
    const attempts = attemptService.getExamAttempts(req.params.examId);
    return apiResponse(res, 200, attempts, 'Exam attempts retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get exam attempts.', error.message);
  }
};

module.exports = {
  startAttempt,
  getActiveSession,
  saveResponse,
  updateCurrentQuestion,
  submitExam,
  getAttemptHistory,
  getAttemptDetails,
  getExamAttempts
};

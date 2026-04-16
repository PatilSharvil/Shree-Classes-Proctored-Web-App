const attemptService = require('./attempts.service');
const examService = require('../exams/exams.service');
const questionService = require('../questions/questions.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Start exam attempt
 * POST /api/attempts/start
 */
const startAttempt = async (req, res) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      return errorResponse(res, 400, 'Exam ID is required.');
    }

    // Check exam availability
    const availability = await examService.isExamAvailable(examId);
    if (!availability.available) {
      return errorResponse(res, 400, availability.reason);
    }

    const session = await attemptService.startAttempt(req.user.id, examId);
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
const getActiveSession = async (req, res) => {
  try {
    const session = await attemptService.getActiveSession(req.user.id, req.params.examId);

    if (!session) {
      return errorResponse(res, 404, 'No active session found.');
    }

    // Check if exam is still available (not ended)
    const availability = await examService.isExamAvailable(session.exam_id);
    if (!availability.available) {
      // Auto-submit the stale session
      await attemptService.autoSubmitExam(session.id, 'EXAM_ENDED');
      return errorResponse(res, 400, availability.reason);
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
const saveResponse = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, selectedOption } = req.body;

    if (!questionId || selectedOption === undefined) {
      return errorResponse(res, 400, 'Question ID and selected option are required.');
    }

    const result = await attemptService.saveResponse(sessionId, questionId, selectedOption);
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
const updateCurrentQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { index } = req.body;

    if (index === undefined) {
      return errorResponse(res, 400, 'Question index is required.');
    }

    const result = await attemptService.updateCurrentQuestion(sessionId, index);
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
const submitExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await attemptService.submitExam(sessionId);
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
const getAttemptHistory = async (req, res) => {
  try {
    const { examId } = req.query;
    const history = await attemptService.getAttemptHistory(req.user.id, examId);
    return apiResponse(res, 200, history, 'Attempt history retrieved');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get attempt history.', error.message);
  }
};

/**
 * Get attempt details
 * GET /api/attempts/:sessionId/details
 */
const getAttemptDetails = async (req, res) => {
  try {
    const details = await attemptService.getAttemptDetails(req.params.sessionId);
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
const getExamAttempts = async (req, res) => {
  try {
    const attempts = await attemptService.getExamAttempts(req.params.examId);
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

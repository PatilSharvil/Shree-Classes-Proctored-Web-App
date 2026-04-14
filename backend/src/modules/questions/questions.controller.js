const questionService = require('./questions.service');
const examService = require('../exams/exams.service');
const excelService = require('../../services/excelService');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Add question to exam
 * POST /api/exams/:examId/questions
 */
const addQuestion = (req, res) => {
  try {
    const { examId } = req.params;

    // Verify exam exists
    examService.getExamById(examId);

    console.log('📝 Adding question - received data:', JSON.stringify(req.body, null, 2));

    const question = questionService.addQuestion(examId, req.body);
    return apiResponse(res, 201, question, 'Question added successfully');
  } catch (error) {
    console.error('❌ Error in addQuestion:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to add question.', error.message);
  }
};

/**
 * Add questions in bulk
 * POST /api/exams/:examId/questions/bulk
 */
const addQuestionsBulk = (req, res) => {
  try {
    const { examId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return errorResponse(res, 400, 'Questions array is required.');
    }

    // Verify exam exists
    examService.getExamById(examId);

    const result = questionService.addQuestionsBulk(examId, questions);
    return apiResponse(res, 201, result, 'Questions added successfully');
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to add questions.', error.message);
  }
};

/**
 * Upload questions via Excel file
 * POST /api/exams/:examId/questions/upload
 */
const uploadQuestions = (req, res) => {
  try {
    const { examId } = req.params;

    if (!req.file) {
      return errorResponse(res, 400, 'Excel file is required.');
    }

    // Verify exam exists
    examService.getExamById(examId);

    // Parse Excel file
    const excelData = excelService.importFromBuffer(req.file.buffer);
    
    // Import questions
    const result = questionService.importFromExcelData(examId, excelData);
    return apiResponse(res, 201, result, 'Questions imported successfully');
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to import questions.', error.message);
  }
};

/**
 * Get questions for an exam
 * GET /api/exams/:examId/questions
 */
const getQuestions = (req, res) => {
  try {
    const { examId } = req.params;
    const { includeCorrect = 'false', shuffled = 'false', shuffledOptions = 'false' } = req.query;

    // Verify exam exists
    examService.getExamById(examId);

    const questions = questionService.getQuestionsByExam(examId, {
      includeCorrect: includeCorrect === 'true',
      shuffled: shuffled === 'true',
      shuffledOptions: shuffledOptions === 'true'
    });

    return apiResponse(res, 200, questions, 'Questions retrieved successfully');
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to get questions.', error.message);
  }
};

/**
 * Get question by ID
 * GET /api/questions/:id
 */
const getQuestionById = (req, res) => {
  try {
    const question = questionService.getQuestionWithAnswer(req.params.id);
    return apiResponse(res, 200, question, 'Question retrieved successfully');
  } catch (error) {
    if (error.message === 'Question not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to get question.', error.message);
  }
};

/**
 * Update question
 * PUT /api/questions/:id
 */
const updateQuestion = (req, res) => {
  try {
    const question = questionService.updateQuestion(req.params.id, req.body);
    return apiResponse(res, 200, question, 'Question updated successfully');
  } catch (error) {
    if (error.message === 'Question not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to update question.', error.message);
  }
};

/**
 * Delete question
 * DELETE /api/questions/:id
 */
const deleteQuestion = (req, res) => {
  try {
    const result = questionService.deleteQuestion(req.params.id);
    return apiResponse(res, 200, result, 'Question deleted successfully');
  } catch (error) {
    if (error.message === 'Question not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to delete question.', error.message);
  }
};

module.exports = {
  addQuestion,
  addQuestionsBulk,
  uploadQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
};

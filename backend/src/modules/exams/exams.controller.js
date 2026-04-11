const examService = require('./exams.service');
const { apiResponse, errorResponse } = require('../../utils/apiResponse');

/**
 * Create exam
 * POST /api/exams
 */
const createExam = (req, res) => {
  try {
    const {
      title, description, subject, duration_minutes, total_marks,
      negative_marks, passing_percentage, scheduled_start, scheduled_end,
      is_active, tab_switch_threshold, looking_away_threshold
    } = req.body;

    // Validation - Required fields
    if (!title) {
      return errorResponse(res, 400, 'Exam title is required.');
    }

    if (!duration_minutes) {
      return errorResponse(res, 400, 'Duration is required.');
    }

    if (Number(duration_minutes) <= 0) {
      return errorResponse(res, 400, 'Duration must be a positive number (minimum 1 minute).');
    }

    if (Number(duration_minutes) > 1440) {
      return errorResponse(res, 400, 'Duration cannot exceed 24 hours (1440 minutes).');
    }

    if (!total_marks) {
      return errorResponse(res, 400, 'Total marks is required.');
    }

    if (Number(total_marks) <= 0) {
      return errorResponse(res, 400, 'Total marks must be a positive number.');
    }

    // Validation - Optional fields with constraints
    if (negative_marks !== undefined && Number(negative_marks) < 0) {
      return errorResponse(res, 400, 'Negative marks cannot be negative.');
    }

    if (passing_percentage !== undefined && (Number(passing_percentage) < 0 || Number(passing_percentage) > 100)) {
      return errorResponse(res, 400, 'Passing percentage must be between 0 and 100.');
    }

    // Validate tab switch threshold
    if (tab_switch_threshold !== undefined && (Number(tab_switch_threshold) < 1 || Number(tab_switch_threshold) > 100)) {
      return errorResponse(res, 400, 'Tab switch threshold must be between 1 and 100.');
    }

    // Validate looking away threshold
    if (looking_away_threshold !== undefined && (Number(looking_away_threshold) < 1 || Number(looking_away_threshold) > 100)) {
      return errorResponse(res, 400, 'Looking away threshold must be between 1 and 100.');
    }

    // Validate scheduled times
    if (scheduled_start && scheduled_end) {
      const startDate = new Date(scheduled_start);
      const endDate = new Date(scheduled_end);
      
      if (endDate <= startDate) {
        return errorResponse(res, 400, 'Scheduled end time must be after scheduled start time.');
      }
    }

    const exam = examService.createExam({
      title, description, subject, duration_minutes, total_marks,
      negative_marks, passing_percentage, scheduled_start, scheduled_end,
      is_active, tab_switch_threshold, looking_away_threshold
    }, req.user.id);

    return apiResponse(res, 201, exam, 'Exam created successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to create exam.', error.message);
  }
};

/**
 * Get all exams
 * GET /api/exams
 */
const getAllExams = (req, res) => {
  try {
    const { is_active, subject, created_by } = req.query;
    const filters = {};

    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }
    if (subject) {
      filters.subject = subject;
    }
    if (created_by) {
      filters.created_by = created_by;
    }

    const exams = examService.getAllExams(filters);
    return apiResponse(res, 200, exams, 'Exams retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get exams.', error.message);
  }
};

/**
 * Get active exams
 * GET /api/exams/active
 */
const getActiveExams = (req, res) => {
  try {
    const exams = examService.getActiveExams();
    return apiResponse(res, 200, exams, 'Active exams retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get active exams.', error.message);
  }
};

/**
 * Get exam by ID
 * GET /api/exams/:id
 */
const getExamById = (req, res) => {
  try {
    const exam = examService.getExamById(req.params.id);
    return apiResponse(res, 200, exam, 'Exam retrieved successfully');
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to get exam.', error.message);
  }
};

/**
 * Get exam stats
 * GET /api/exams/:id/stats
 */
const getExamStats = (req, res) => {
  try {
    const stats = examService.getExamStats(req.params.id);
    return apiResponse(res, 200, stats, 'Exam stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get exam stats.', error.message);
  }
};

/**
 * Update exam
 * PUT /api/exams/:id
 */
const updateExam = (req, res) => {
  try {
    const exam = examService.updateExam(req.params.id, req.body);
    return apiResponse(res, 200, exam, 'Exam updated successfully');
  } catch (error) {
    console.error('Error updating exam:', error);
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    if (error.message === 'No fields to update.') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to update exam.', error.message);
  }
};

/**
 * Delete exam
 * DELETE /api/exams/:id
 */
const deleteExam = (req, res) => {
  try {
    const result = examService.deleteExam(req.params.id);
    return apiResponse(res, 200, result, 'Exam deleted successfully');
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to delete exam.', error.message);
  }
};

/**
 * Check exam availability
 * GET /api/exams/:id/availability
 */
const checkAvailability = (req, res) => {
  try {
    const result = examService.isExamAvailable(req.params.id);
    return apiResponse(res, 200, result, result.available ? 'Exam is available' : result.reason);
  } catch (error) {
    if (error.message === 'Exam not found.') {
      return errorResponse(res, 404, error.message);
    }
    return errorResponse(res, 500, 'Failed to check availability.', error.message);
  }
};

module.exports = {
  createExam,
  getAllExams,
  getActiveExams,
  getExamById,
  getExamStats,
  updateExam,
  deleteExam,
  checkAvailability
};

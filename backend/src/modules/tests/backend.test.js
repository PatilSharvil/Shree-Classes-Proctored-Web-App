/**
 * BACKEND UNIT TESTS
 * Tests for: Auth validation, Exam controller, API response utils
 * 
 * Framework: Jest + Supertest (already installed)
 * Run: npm test (from backend folder)
 * 
 * NOTE: These are pure unit tests — they test logic WITHOUT starting
 *       the real server or connecting to the SQLite database.
 *       All DB calls are mocked.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MOCK: Database
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('../config/database', () => ({
  prepare: jest.fn(() => ({
    get: jest.fn(),
    all: jest.fn(() => []),
    run: jest.fn(),
  })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MOCK: Config/env
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('../config/env', () => ({
  jwtSecret: 'test-secret-key-12345',
  jwtExpire: '1h',
  adminEmail: 'admin@example.com',
  adminPassword: 'Admin@123',
  nodeEnv: 'test',
}));

// ─────────────────────────────────────────────────────────────────────────────
// MOCK: uuid
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const { apiResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create mock Express res object
// ─────────────────────────────────────────────────────────────────────────────
const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: jest.fn().mockImplementation(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (data) {
      this.body = data;
      return this;
    }),
  };
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. API RESPONSE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
describe('Utils: apiResponse & errorResponse', () => {
  let res;

  beforeEach(() => {
    res = createMockRes();
  });

  it('apiResponse sends correct status code', () => {
    apiResponse(res, 200, { id: 1 }, 'Success');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('apiResponse sets success: true for 2xx codes', () => {
    apiResponse(res, 201, {}, 'Created');
    expect(res.body.success).toBe(true);
  });

  it('apiResponse sets correct message', () => {
    apiResponse(res, 200, {}, 'Exams retrieved successfully');
    expect(res.body.message).toBe('Exams retrieved successfully');
  });

  it('apiResponse sets data correctly', () => {
    const data = { id: 'exam-1', title: 'Test' };
    apiResponse(res, 200, data, 'OK');
    expect(res.body.data).toEqual(data);
  });

  it('errorResponse sends correct status code', () => {
    errorResponse(res, 400, 'Bad request');
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('errorResponse sets success: false', () => {
    errorResponse(res, 400, 'Validation error');
    expect(res.body.success).toBe(false);
  });

  it('errorResponse sets correct message', () => {
    errorResponse(res, 404, 'Exam not found.');
    expect(res.body.message).toBe('Exam not found.');
  });

  it('errorResponse includes timestamp', () => {
    errorResponse(res, 500, 'Server error');
    expect(res.body.timestamp).toBeDefined();
  });

  it('errorResponse sets errors field when provided', () => {
    errorResponse(res, 400, 'Error', 'Details of error');
    expect(res.body.errors).toBe('Details of error');
  });

  it('errorResponse sets errors to null when not provided', () => {
    errorResponse(res, 400, 'Error');
    expect(res.body.errors).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXAM CONTROLLER: createExam
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: createExam Validation (Fix #11)', () => {
  const { createExam } = require('../modules/exams/exams.controller');

  const createReq = (body = {}) => ({
    body,
    user: { id: 'admin-1' },
  });

  let res;
  beforeEach(() => {
    res = createMockRes();
    jest.clearAllMocks();

    // Default mock for examService.createExam
    const examService = require('../modules/exams/exams.service');
    examService.createExam = jest.fn().mockReturnValue({
      id: 'exam-new',
      title: 'Test Exam',
      duration_minutes: 60,
      total_marks: 100,
    });
  });

  it('returns 400 when title is missing', () => {
    createExam(createReq({ duration_minutes: 60, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when duration_minutes is missing', () => {
    createExam(createReq({ title: 'Test', total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when total_marks is missing', () => {
    createExam(createReq({ title: 'Test', duration_minutes: 60 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative duration_minutes', () => {
    createExam(createReq({ title: 'Test', duration_minutes: -5, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('positive');
  });

  it('returns 400 for zero duration_minutes', () => {
    createExam(createReq({ title: 'Test', duration_minutes: 0, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative total_marks', () => {
    createExam(createReq({ title: 'Test', duration_minutes: 60, total_marks: -10 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('positive');
  });

  it('returns 400 for zero total_marks', () => {
    createExam(createReq({ title: 'Test', duration_minutes: 60, total_marks: 0 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 with valid data', () => {
    createExam(createReq({ title: 'Valid Exam', duration_minutes: 60, total_marks: 100 }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns error message for negative duration', () => {
    createExam(createReq({ title: 'Test', duration_minutes: -1, total_marks: 50 }), res);
    expect(res.body.message).toBe('Duration must be a positive number (minimum 1 minute).');
  });

  it('returns error message for negative total_marks', () => {
    createExam(createReq({ title: 'Test', duration_minutes: 30, total_marks: -50 }), res);
    expect(res.body.message).toBe('Total marks must be a positive number.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTH SERVICE: Validation Logic (Fixes #12 & #13)
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Service: Email & Password Validation (Fixes #12, #13)', () => {
  // Inline the validation logic mirroring auth.service.js
  const validateUserInput = ({ email, password }) => {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push('Invalid email format. Please enter a valid email address.');
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters long.');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
    return errors;
  };

  it('passes with valid email and strong password', () => {
    const errors = validateUserInput({ email: 'student@school.com', password: 'Student1' });
    expect(errors).toHaveLength(0);
  });

  it('fails invalid email: no domain', () => {
    const errors = validateUserInput({ email: 'student@', password: 'Student1' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails invalid email: plain text', () => {
    const errors = validateUserInput({ email: 'notanemail', password: 'Student1' });
    expect(errors).toContain('Invalid email format. Please enter a valid email address.');
  });

  it('fails password less than 8 chars', () => {
    const errors = validateUserInput({ email: 'a@b.com', password: 'Ab1' });
    expect(errors).toContain('Password must be at least 8 characters long.');
  });

  it('fails password with no uppercase', () => {
    const errors = validateUserInput({ email: 'a@b.com', password: 'student1pass' });
    expect(errors).toContain('Password must contain at least one uppercase letter.');
  });

  it('fails password with no number', () => {
    const errors = validateUserInput({ email: 'a@b.com', password: 'StudentPass' });
    expect(errors).toContain('Password must contain at least one number.');
  });

  it('accumulates multiple password errors', () => {
    const errors = validateUserInput({ email: 'ok@test.com', password: 'abc' });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts email with subdomains', () => {
    const errors = validateUserInput({ email: 'user@mail.school.edu', password: 'Student1' });
    expect(errors.filter(e => e.includes('email'))).toHaveLength(0);
  });

  it('accepts exactly 8 char password with required complexity', () => {
    const errors = validateUserInput({ email: 'test@test.com', password: 'Student1' });
    expect(errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXAM CONTROLLER: getAllExams
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: getAllExams', () => {
  const { getAllExams } = require('../modules/exams/exams.controller');
  const examService = require('../modules/exams/exams.service');
  let res;

  beforeEach(() => {
    res = createMockRes();
    jest.clearAllMocks();
  });

  it('returns 200 with list of exams', () => {
    examService.getAllExams = jest.fn().mockReturnValue([
      { id: 'e1', title: 'Physics Test' },
      { id: 'e2', title: 'Chemistry Test' },
    ]);
    const req = { query: {} };
    getAllExams(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 200 with empty array when no exams', () => {
    examService.getAllExams = jest.fn().mockReturnValue([]);
    getAllExams({ query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters by is_active=true when provided', () => {
    examService.getAllExams = jest.fn().mockReturnValue([]);
    getAllExams({ query: { is_active: 'true' } }, res);
    expect(examService.getAllExams).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true })
    );
  });

  it('returns 500 on service error', () => {
    examService.getAllExams = jest.fn().mockImplementation(() => {
      throw new Error('DB error');
    });
    getAllExams({ query: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXAM CONTROLLER: getExamById
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: getExamById', () => {
  const { getExamById } = require('../modules/exams/exams.controller');
  const examService = require('../modules/exams/exams.service');
  let res;

  beforeEach(() => {
    res = createMockRes();
    jest.clearAllMocks();
  });

  it('returns 200 with exam data', () => {
    examService.getExamById = jest.fn().mockReturnValue({ id: 'e1', title: 'Test' });
    getExamById({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Test');
  });

  it('returns 404 when exam is not found', () => {
    examService.getExamById = jest.fn().mockImplementation(() => {
      throw new Error('Exam not found.');
    });
    getExamById({ params: { id: 'nonexistent' } }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Exam not found.');
  });

  it('returns 500 on unexpected error', () => {
    examService.getExamById = jest.fn().mockImplementation(() => {
      throw new Error('DB connection failed');
    });
    getExamById({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXAM CONTROLLER: deleteExam
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: deleteExam', () => {
  const { deleteExam } = require('../modules/exams/exams.controller');
  const examService = require('../modules/exams/exams.service');
  let res;

  beforeEach(() => {
    res = createMockRes();
    jest.clearAllMocks();
  });

  it('returns 200 on successful delete', () => {
    examService.deleteExam = jest.fn().mockReturnValue({ deleted: true });
    deleteExam({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when exam not found', () => {
    examService.deleteExam = jest.fn().mockImplementation(() => {
      throw new Error('Exam not found.');
    });
    deleteExam({ params: { id: 'x' } }, res);
    expect(res.statusCode).toBe(404);
  });
});

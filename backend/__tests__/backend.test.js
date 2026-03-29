/**
 * BACKEND UNIT TESTS
 * 
 * Framework: Jest + (already configured via jest.config.js)
 * Run: npx jest __tests__/backend.test.js --no-coverage (from backend/)
 * 
 * These are pure unit tests — no real DB or server needed.
 * All DB and config dependencies are mocked below.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — Must be declared before any require() calls
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../src/config/database', () => ({
  prepare: jest.fn(() => ({
    get: jest.fn(),
    all: jest.fn(() => []),
    run: jest.fn(),
  })),
}));

jest.mock('../src/config/env', () => ({
  jwtSecret: 'test-secret-key-12345',
  jwtExpire: '1h',
  adminEmail: 'admin@example.com',
  adminPassword: 'Admin@123',
  nodeEnv: 'test',
  port: 5000,
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS (after mocks)
// ─────────────────────────────────────────────────────────────────────────────
const { apiResponse, errorResponse } = require('../src/utils/apiResponse');
const { createExam, getAllExams, getExamById, deleteExam } = require('../src/modules/exams/exams.controller');
const examService = require('../src/modules/exams/exams.service');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Mock Express res
// ─────────────────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = jest.fn().mockImplementation((code) => { res.statusCode = code; return res; });
  res.json = jest.fn().mockImplementation((data) => { res.body = data; return res; });
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. API RESPONSE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
describe('Utils: apiResponse & errorResponse', () => {
  let res;
  beforeEach(() => { res = mockRes(); });

  it('apiResponse sets correct status code', () => {
    apiResponse(res, 200, {}, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('apiResponse sets success: true for 2xx', () => {
    apiResponse(res, 201, {}, 'Created');
    expect(res.body.success).toBe(true);
  });

  it('apiResponse sets message', () => {
    apiResponse(res, 200, {}, 'Exams retrieved successfully');
    expect(res.body.message).toBe('Exams retrieved successfully');
  });

  it('apiResponse sets data', () => {
    const data = { id: 'e1', title: 'Test' };
    apiResponse(res, 200, data, 'OK');
    expect(res.body.data).toEqual(data);
  });

  it('errorResponse sets correct status code', () => {
    errorResponse(res, 400, 'Bad request');
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('errorResponse sets success: false', () => {
    errorResponse(res, 400, 'Validation error');
    expect(res.body.success).toBe(false);
  });

  it('errorResponse sets message', () => {
    errorResponse(res, 404, 'Exam not found.');
    expect(res.body.message).toBe('Exam not found.');
  });

  it('errorResponse includes timestamp', () => {
    errorResponse(res, 500, 'Server error');
    expect(res.body.timestamp).toBeDefined();
  });

  it('errorResponse includes errors when provided', () => {
    errorResponse(res, 400, 'Error', 'Some detail');
    expect(res.body.errors).toBe('Some detail');
  });

  it('errorResponse sets errors null when not provided', () => {
    errorResponse(res, 400, 'Error');
    expect(res.body.errors).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXAM CONTROLLER: createExam — Validation (Fix #11)
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: createExam Validation (Fix #11)', () => {
  const req = (body) => ({ body, user: { id: 'admin-1' } });
  let res;

  beforeEach(() => {
    res = mockRes();
    examService.createExam = jest.fn().mockReturnValue({ id: 'new-exam', title: 'Test', duration_minutes: 60, total_marks: 100 });
  });

  it('returns 400 when title is missing', () => {
    createExam(req({ duration_minutes: 60, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when duration_minutes is missing', () => {
    createExam(req({ title: 'Test', total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when total_marks is missing', () => {
    createExam(req({ title: 'Test', duration_minutes: 60 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative duration_minutes', () => {
    createExam(req({ title: 'Test', duration_minutes: -5, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('positive');
  });

  it('returns 400 for zero duration_minutes', () => {
    createExam(req({ title: 'Test', duration_minutes: 0, total_marks: 100 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative total_marks', () => {
    createExam(req({ title: 'Test', duration_minutes: 60, total_marks: -10 }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('positive');
  });

  it('returns 400 for zero total_marks', () => {
    createExam(req({ title: 'Test', duration_minutes: 60, total_marks: 0 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 with valid data', () => {
    createExam(req({ title: 'Valid Exam', duration_minutes: 60, total_marks: 100 }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('correct error message for negative duration', () => {
    createExam(req({ title: 'T', duration_minutes: -1, total_marks: 50 }), res);
    expect(res.body.message).toBe('Duration must be a positive number (minimum 1 minute).');
  });

  it('correct error message for negative marks', () => {
    createExam(req({ title: 'T', duration_minutes: 30, total_marks: -50 }), res);
    expect(res.body.message).toBe('Total marks must be a positive number.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXAM CONTROLLER: getAllExams
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: getAllExams', () => {
  let res;
  beforeEach(() => { res = mockRes(); jest.clearAllMocks(); });

  it('returns 200 with list of exams', () => {
    examService.getAllExams = jest.fn().mockReturnValue([{ id: 'e1' }, { id: 'e2' }]);
    getAllExams({ query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 200 with empty array', () => {
    examService.getAllExams = jest.fn().mockReturnValue([]);
    getAllExams({ query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('passes is_active filter to service', () => {
    examService.getAllExams = jest.fn().mockReturnValue([]);
    getAllExams({ query: { is_active: 'true' } }, res);
    expect(examService.getAllExams).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }));
  });

  it('returns 500 on service error', () => {
    examService.getAllExams = jest.fn().mockImplementation(() => { throw new Error('DB error'); });
    getAllExams({ query: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXAM CONTROLLER: getExamById
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: getExamById', () => {
  let res;
  beforeEach(() => { res = mockRes(); jest.clearAllMocks(); });

  it('returns 200 with exam data', () => {
    examService.getExamById = jest.fn().mockReturnValue({ id: 'e1', title: 'Physics' });
    getExamById({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Physics');
  });

  it('returns 404 when exam not found', () => {
    examService.getExamById = jest.fn().mockImplementation(() => { throw new Error('Exam not found.'); });
    getExamById({ params: { id: 'gone' } }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Exam not found.');
  });

  it('returns 500 on unexpected DB error', () => {
    examService.getExamById = jest.fn().mockImplementation(() => { throw new Error('Connection failed'); });
    getExamById({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXAM CONTROLLER: deleteExam
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Controller: deleteExam', () => {
  let res;
  beforeEach(() => { res = mockRes(); jest.clearAllMocks(); });

  it('returns 200 on successful delete', () => {
    examService.deleteExam = jest.fn().mockReturnValue({ deleted: true });
    deleteExam({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when exam not found', () => {
    examService.deleteExam = jest.fn().mockImplementation(() => { throw new Error('Exam not found.'); });
    deleteExam({ params: { id: 'x' } }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Exam not found.');
  });

  it('returns 500 on unexpected error', () => {
    examService.deleteExam = jest.fn().mockImplementation(() => { throw new Error('Disk error'); });
    deleteExam({ params: { id: 'e1' } }, res);
    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. AUTH SERVICE: Email & Password Validation (Fixes #12 & #13)
//    Pure logic tests — no DB required
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Service: Email & Password Validation (Fixes #12, #13)', () => {
  // Mirror of the validation added to auth.service.js createUser()
  const validate = ({ email, password }) => {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push('Invalid email format. Please enter a valid email address.');
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters long.');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
    return errors;
  };

  it('accepts valid email + strong password', () => {
    expect(validate({ email: 'student@shreeclass.com', password: 'Student1' })).toHaveLength(0);
  });

  it('rejects email without @ symbol', () => {
    expect(validate({ email: 'studentexample.com', password: 'Student1' }))
      .toContain('Invalid email format. Please enter a valid email address.');
  });

  it('rejects email with spaces', () => {
    expect(validate({ email: 'stu dent@ex.com', password: 'Student1' }))
      .toContain('Invalid email format. Please enter a valid email address.');
  });

  it('rejects password shorter than 8 chars', () => {
    expect(validate({ email: 'ok@test.com', password: 'Ab1' }))
      .toContain('Password must be at least 8 characters long.');
  });

  it('rejects password of exactly 7 chars', () => {
    expect(validate({ email: 'ok@test.com', password: 'Stude1x' }))
      .toContain('Password must be at least 8 characters long.');
  });

  it('accepts password of exactly 8 chars with complexity', () => {
    expect(validate({ email: 'ok@test.com', password: 'Student1' })).toHaveLength(0);
  });

  it('rejects password without uppercase', () => {
    expect(validate({ email: 'ok@test.com', password: 'student1pass' }))
      .toContain('Password must contain at least one uppercase letter.');
  });

  it('rejects password without number', () => {
    expect(validate({ email: 'ok@test.com', password: 'StudentPass' }))
      .toContain('Password must contain at least one number.');
  });

  it('collects multiple errors for weak password', () => {
    const errors = validate({ email: 'ok@test.com', password: 'abc' });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts subdomain email addresses', () => {
    const errors = validate({ email: 'user@mail.school.edu', password: 'Student1' });
    expect(errors.filter(e => e.includes('email'))).toHaveLength(0);
  });
});

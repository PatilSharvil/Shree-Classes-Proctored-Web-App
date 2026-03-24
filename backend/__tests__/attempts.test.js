const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

describe('Attempts Module Tests', () => {
  let authToken;
  let testExamId;
  let testSessionId;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin@123'
      });
    
    authToken = loginRes.body.data.token;

    // Create test exam
    const examRes = await request(app)
      .post('/api/exams')
      .send({
        title: 'Attempt Test Exam',
        duration_minutes: 60,
        total_marks: 100
      })
      .set('Authorization', `Bearer ${authToken}`);
    
    if (examRes.body.data) {
      testExamId = examRes.body.data.id;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testSessionId) {
      db.prepare('DELETE FROM exam_sessions WHERE id = ?').run(testSessionId);
    }
    if (testExamId) {
      db.prepare('DELETE FROM exams WHERE id = ?').run(testExamId);
    }
  });

  describe('POST /api/attempts/start', () => {
    it('should start exam attempt successfully', async () => {
      const res = await request(app)
        .post('/api/attempts/start')
        .send({ examId: testExamId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('IN_PROGRESS');
      
      testSessionId = res.body.data.id;
    });

    it('should reject start without examId', async () => {
      const res = await request(app)
        .post('/api/attempts/start')
        .send({})
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject start for non-existent exam', async () => {
      const res = await request(app)
        .post('/api/attempts/start')
        .send({ examId: 'non-existent-id' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/attempts/:sessionId/respond', () => {
    it('should save response successfully', async () => {
      if (!testSessionId) return;

      const res = await request(app)
        .post(`/api/attempts/${testSessionId}/respond`)
        .send({
          questionId: 'test-question-id',
          selectedOption: 'A'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject response without questionId', async () => {
      if (!testSessionId) return;

      const res = await request(app)
        .post(`/api/attempts/${testSessionId}/respond`)
        .send({
          selectedOption: 'A'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject response without selectedOption', async () => {
      if (!testSessionId) return;

      const res = await request(app)
        .post(`/api/attempts/${testSessionId}/respond`)
        .send({
          questionId: 'test-question-id'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/attempts/:sessionId/question', () => {
    it('should update question index', async () => {
      if (!testSessionId) return;

      const res = await request(app)
        .put(`/api/attempts/${testSessionId}/question`)
        .send({ index: 5 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/attempts/:sessionId/submit', () => {
    it('should submit exam successfully', async () => {
      if (!testSessionId) return;

      const res = await request(app)
        .post(`/api/attempts/${testSessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });
  });

  describe('GET /api/attempts/history', () => {
    it('should get attempt history', async () => {
      const res = await request(app)
        .get('/api/attempts/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/attempts/active/:examId', () => {
    it('should get active attempt for exam', async () => {
      const res = await request(app)
        .get(`/api/attempts/active/${testExamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/attempts/exam/:examId', () => {
    it('should get all attempts for exam', async () => {
      const res = await request(app)
        .get(`/api/attempts/exam/${testExamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

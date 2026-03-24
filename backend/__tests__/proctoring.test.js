const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

describe('Proctoring Module Tests', () => {
  let authToken;
  let testSessionId;
  let testExamId;

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
        title: 'Proctoring Test Exam',
        description: 'Test exam for proctoring tests',
        subject: 'PCM',
        duration_minutes: 60,
        total_marks: 100
      })
      .set('Authorization', `Bearer ${authToken}`);
    
    if (examRes.body.data) {
      testExamId = examRes.body.data.id;
    }

    // Create test session
    testSessionId = uuidv4();
    db.prepare(`
      INSERT INTO exam_sessions (id, user_id, exam_id, status, violation_count)
      VALUES (?, ?, ?, 'IN_PROGRESS', 0)
    `).run(testSessionId, '0e3a79cb-05be-4719-a6f4-417a34723d9b', testExamId);
  });

  afterAll(async () => {
    // Cleanup
    if (testSessionId) {
      db.prepare('DELETE FROM violations WHERE session_id = ?').run(testSessionId);
      db.prepare('DELETE FROM proctoring_logs WHERE session_id = ?').run(testSessionId);
      db.prepare('DELETE FROM exam_sessions WHERE id = ?').run(testSessionId);
    }
    if (testExamId) {
      db.prepare('DELETE FROM exams WHERE id = ?').run(testExamId);
    }
  });

  describe('POST /api/proctoring/violations', () => {
    it('should record a violation successfully', async () => {
      const res = await request(app)
        .post('/api/proctoring/violations')
        .send({
          sessionId: testSessionId,
          type: 'TAB_SWITCH',
          description: 'User switched tabs',
          severity: 'MEDIUM'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('violationId');
      expect(res.body.data).toHaveProperty('totalViolations');
    });

    it('should reject violation without sessionId', async () => {
      const res = await request(app)
        .post('/api/proctoring/violations')
        .send({
          type: 'TAB_SWITCH'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject violation without type', async () => {
      const res = await request(app)
        .post('/api/proctoring/violations')
        .send({
          sessionId: testSessionId
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should record violation with default severity', async () => {
      const res = await request(app)
        .post('/api/proctoring/violations')
        .send({
          sessionId: testSessionId,
          type: 'WINDOW_BLUR',
          description: 'Window lost focus'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.severity).toBe('MEDIUM');
    });

    it('should record HIGH severity violation', async () => {
      const res = await request(app)
        .post('/api/proctoring/violations')
        .send({
          sessionId: testSessionId,
          type: 'COPY_ATTEMPT',
          description: 'User tried to copy content',
          severity: 'HIGH'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.severity).toBe('HIGH');
    });
  });

  describe('POST /api/proctoring/log', () => {
    it('should log activity successfully', async () => {
      const res = await request(app)
        .post('/api/proctoring/log')
        .send({
          sessionId: testSessionId,
          eventType: 'EXAM_START',
          eventData: { timestamp: new Date().toISOString() },
          isViolation: false
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('logId');
    });

    it('should log violation activity', async () => {
      const res = await request(app)
        .post('/api/proctoring/log')
        .send({
          sessionId: testSessionId,
          eventType: 'VIOLATION_TAB_SWITCH',
          eventData: { description: 'Tab switch detected' },
          isViolation: true
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.isViolation).toBe(true);
    });

    it('should reject log without sessionId', async () => {
      const res = await request(app)
        .post('/api/proctoring/log')
        .send({
          eventType: 'EXAM_START'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/proctoring/violations/:sessionId', () => {
    it('should get violations for session', async () => {
      const res = await request(app)
        .get(`/api/proctoring/violations/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array for session with no violations', async () => {
      const emptySessionId = uuidv4();
      
      db.prepare(`
        INSERT INTO exam_sessions (id, user_id, exam_id, status)
        VALUES (?, ?, ?, 'IN_PROGRESS')
      `).run(emptySessionId, '0e3a79cb-05be-4719-a6f4-417a34723d9b', testExamId);

      const res = await request(app)
        .get(`/api/proctoring/violations/${emptySessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);

      db.prepare('DELETE FROM exam_sessions WHERE id = ?').run(emptySessionId);
    });
  });

  describe('GET /api/proctoring/activity/:sessionId', () => {
    it('should get activity logs for session', async () => {
      const res = await request(app)
        .get(`/api/proctoring/activity/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get(`/api/proctoring/activity/${testSessionId}?limit=5`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/proctoring/check-submit/:sessionId', () => {
    it('should return auto-submit status', async () => {
      const res = await request(app)
        .get(`/api/proctoring/check-submit/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('shouldSubmit');
      expect(res.body.data).toHaveProperty('currentCount');
      expect(res.body.data).toHaveProperty('threshold');
    });
  });

  describe('GET /api/proctoring/score/:sessionId', () => {
    it('should return weighted violation score', async () => {
      const res = await request(app)
        .get(`/api/proctoring/score/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('score');
    });
  });

  describe('GET /api/proctoring/stats/:examId', () => {
    it('should get exam violation stats', async () => {
      const res = await request(app)
        .get(`/api/proctoring/stats/${testExamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('DELETE /api/proctoring/violations/:sessionId', () => {
    it('should clear violations for session', async () => {
      const res = await request(app)
        .delete(`/api/proctoring/violations/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

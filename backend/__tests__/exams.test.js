const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Exams Module Tests', () => {
  let authToken;
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
  });

  afterAll(async () => {
    // Cleanup test exams
    if (testExamId) {
      db.prepare('DELETE FROM exams WHERE id = ?').run(testExamId);
    }
  });

  describe('POST /api/exams', () => {
    it('should create exam successfully', async () => {
      const examData = {
        title: 'Test Exam ' + Date.now(),
        description: 'Test description',
        subject: 'PCM',
        duration_minutes: 60,
        total_marks: 100,
        negative_marks: 0,
        passing_percentage: 40
      };

      const res = await request(app)
        .post('/api/exams')
        .send(examData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(examData.title);
      
      testExamId = res.body.data.id;
    });

    it('should reject exam without title', async () => {
      const res = await request(app)
        .post('/api/exams')
        .send({
          description: 'Test',
          duration_minutes: 60,
          total_marks: 100
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject exam without duration', async () => {
      const res = await request(app)
        .post('/api/exams')
        .send({
          title: 'Test Exam',
          total_marks: 100
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject exam without total marks', async () => {
      const res = await request(app)
        .post('/api/exams')
        .send({
          title: 'Test Exam',
          duration_minutes: 60
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject exam with negative duration', async () => {
      const res = await request(app)
        .post('/api/exams')
        .send({
          title: 'Test Exam',
          duration_minutes: -10,
          total_marks: 100
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create exam with optional fields', async () => {
      const examData = {
        title: 'Test Exam with Options ' + Date.now(),
        description: 'Test with all optional fields',
        subject: 'PCB',
        duration_minutes: 90,
        total_marks: 150,
        negative_marks: 0.25,
        passing_percentage: 50,
        scheduled_start: new Date(Date.now() + 86400000).toISOString(),
        scheduled_end: new Date(Date.now() + 172800000).toISOString()
      };

      const res = await request(app)
        .post('/api/exams')
        .send(examData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.subject).toBe('PCB');
      expect(res.body.data.negative_marks).toBe(0.25);
      
      // Cleanup
      db.prepare('DELETE FROM exams WHERE id = ?').run(res.body.data.id);
    });
  });

  describe('GET /api/exams', () => {
    it('should get all exams', async () => {
      const res = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter exams by is_active', async () => {
      const res = await request(app)
        .get('/api/exams?is_active=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(exam => exam.is_active === 1 || exam.is_active === true)).toBe(true);
    });

    it('should filter exams by subject', async () => {
      const res = await request(app)
        .get('/api/exams?subject=PCM')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data.every(exam => exam.subject === 'PCM')).toBe(true);
      }
    });
  });

  describe('GET /api/exams/active', () => {
    it('should get only active exams', async () => {
      const res = await request(app)
        .get('/api/exams/active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/exams/:id', () => {
    it('should get exam by ID', async () => {
      if (!testExamId) return;

      const res = await request(app)
        .get(`/api/exams/${testExamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', testExamId);
    });

    it('should return 404 for non-existent exam', async () => {
      const res = await request(app)
        .get('/api/exams/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/exams/:id', () => {
    it('should update exam successfully', async () => {
      if (!testExamId) return;

      const updateData = {
        title: 'Updated Exam Title',
        description: 'Updated description'
      };

      const res = await request(app)
        .put(`/api/exams/${testExamId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
    });

    it('should reject update for non-existent exam', async () => {
      const res = await request(app)
        .put('/api/exams/non-existent-id')
        .send({ title: 'Update' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/exams/:id/availability', () => {
    it('should check exam availability', async () => {
      if (!testExamId) return;

      const res = await request(app)
        .get(`/api/exams/${testExamId}/availability`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('available');
    });
  });

  describe('DELETE /api/exams/:id', () => {
    it('should delete exam successfully', async () => {
      // Create exam to delete
      const createRes = await request(app)
        .post('/api/exams')
        .send({
          title: 'Exam to Delete',
          duration_minutes: 30,
          total_marks: 50
        })
        .set('Authorization', `Bearer ${authToken}`);

      const examId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/exams/${examId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

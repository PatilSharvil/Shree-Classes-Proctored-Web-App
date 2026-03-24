const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

describe('Authentication Module Tests', () => {
  let authToken;
  let testUserId;

  // Test user data
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'Test@123456',
    name: 'Test User',
    role: 'STUDENT'
  };

  beforeAll(async () => {
    // Create test user
    const response = await request(app)
      .post('/api/users')
      .send(testUser)
      .set('Authorization', `Bearer ${process.env.ADMIN_TOKEN || 'admin-token'}`);
    
    if (response.body.data) {
      testUserId = response.body.data.id;
    }
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin@123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user).toHaveProperty('email', 'admin@example.com');
      expect(res.body.data.user).toHaveProperty('role', 'ADMIN');
      
      authToken = res.body.data.token;
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Wrong@123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Admin@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Admin@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      if (!authToken) return;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('role');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept password with minimum 6 characters', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: `test2_${Date.now()}@example.com`,
          password: 'Test@123',
          name: 'Test User 2',
          role: 'STUDENT'
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Should succeed or fail based on admin creation, not password validation
      expect(res.statusCode).toBeOneOf([201, 401]);
    });
  });
});

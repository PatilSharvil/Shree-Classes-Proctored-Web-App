const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const env = require('../../config/env');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Login user with email and password
   */
  async login(email, password) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password.');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpire }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: false // Disabled - direct dashboard access
      }
    };
  }

  /**
   * Create admin user if not exists
   */
  async createAdminIfNotExists() {
    const { rows } = await query('SELECT * FROM users WHERE role = $1', ['ADMIN']);
    const existingAdmin = rows[0];

    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(env.adminPassword, 10);
    const adminId = uuidv4();

    await query(
      `INSERT INTO users (id, email, password, name, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, env.adminEmail, hashedPassword, 'Admin', 'ADMIN', 0]
    );

    console.log('Default admin user created');
    return { id: adminId, email: env.adminEmail, role: 'ADMIN', must_change_password: 0 };
  }

  /**
   * Create a new user (Admin only)
   */
  async createUser(userData, createdBy) {
    const { rows: existing } = await query('SELECT * FROM users WHERE email = $1', [userData.email]);
    if (existing[0]) {
      throw new Error('User with this email already exists.');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format. Please enter a valid email address.');
    }

    // Password strength validation
    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(userData.password)) {
      throw new Error('Password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(userData.password)) {
      throw new Error('Password must contain at least one number.');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    await query(
      `INSERT INTO users (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5)`,
      [userId, userData.email, hashedPassword, userData.name, userData.role]
    );

    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      role: userData.role
    };
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers() {
    const { rows } = await query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const { rows } = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    const user = rows[0];

    if (!user) {
      throw new Error('User not found.');
    }

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id, userData) {
    await this.getUserById(id); // ensure exists

    const updateFields = [];
    const values = [];
    let idx = 1;

    if (userData.name) {
      updateFields.push(`name = $${idx++}`);
      values.push(userData.name);
    }

    if (userData.email) {
      const { rows } = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [userData.email, id]
      );
      if (rows[0]) {
        throw new Error('Email already in use.');
      }
      updateFields.push(`email = $${idx++}`);
      values.push(userData.email);
    }

    if (userData.password) {
      updateFields.push(`password = $${idx++}`);
      values.push(await bcrypt.hash(userData.password, 10));
    }

    if (userData.role) {
      updateFields.push(`role = $${idx++}`);
      values.push(userData.role);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update.');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getUserById(id);
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    const user = await this.getUserById(id);

    if (user.role === 'ADMIN') {
      throw new Error('Cannot delete admin user.');
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    return { message: 'User deleted successfully.' };
  }

  /**
   * Bulk import students from Excel data
   */
  async bulkImportStudents(studentsData, createdBy) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      students: []
    };

    for (const studentData of studentsData) {
      try {
        // Validate required fields
        if (!studentData.email || !studentData.password) {
          results.failed++;
          results.errors.push({ email: studentData.email || 'Unknown', error: 'Email and password are required' });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
          results.failed++;
          results.errors.push({ email: studentData.email, error: 'Invalid email format' });
          continue;
        }

        // Validate password strength
        if (studentData.password.length < 8) {
          results.failed++;
          results.errors.push({ email: studentData.email, error: 'Password must be at least 8 characters' });
          continue;
        }
        if (!/[A-Z]/.test(studentData.password)) {
          results.failed++;
          results.errors.push({ email: studentData.email, error: 'Password must contain at least one uppercase letter' });
          continue;
        }
        if (!/[0-9]/.test(studentData.password)) {
          results.failed++;
          results.errors.push({ email: studentData.email, error: 'Password must contain at least one number' });
          continue;
        }

        // Check if user already exists
        const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [studentData.email]);
        if (existing[0]) {
          results.failed++;
          results.errors.push({ email: studentData.email, error: 'User already exists' });
          continue;
        }

        // Create user
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(studentData.password, 10);
        const name = studentData.name || '';

        await query(
          `INSERT INTO users (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5)`,
          [userId, studentData.email, hashedPassword, name, 'STUDENT']
        );

        results.success++;
        results.students.push({ id: userId, email: studentData.email, name });
      } catch (error) {
        results.failed++;
        results.errors.push({ email: studentData.email || 'Unknown', error: error.message });
      }
    }

    return results;
  }
}

module.exports = new AuthService();

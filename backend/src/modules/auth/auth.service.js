const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const env = require('../../config/env');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Login user with email and password
   */
  async login(email, password) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

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
    const existingAdmin = db.prepare('SELECT * FROM users WHERE role = ?').get('ADMIN');

    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(env.adminPassword, 10);
    const adminId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, password, name, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, env.adminEmail, hashedPassword, 'Admin', 'ADMIN', 0);

    console.log('Default admin user created');
    return { id: adminId, email: env.adminEmail, role: 'ADMIN', must_change_password: 0 };
  }

  /**
   * Create a new user (Admin only)
   */
  createUser(userData, createdBy) {
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(userData.email);

    if (existingUser) {
      throw new Error('User with this email already exists.');
    }

    // Fix #12 — Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format. Please enter a valid email address.');
    }

    // Fix #13 — Password strength validation
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
    const hashedPassword = bcrypt.hashSync(userData.password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, userData.email, hashedPassword, userData.name, userData.role);

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
  getAllUsers() {
    return db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
  }

  /**
   * Get user by ID
   */
  getUserById(id) {
    const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id);
    
    if (!user) {
      throw new Error('User not found.');
    }

    return user;
  }

  /**
   * Update user
   */
  updateUser(id, userData) {
    const user = this.getUserById(id);

    const updateFields = [];
    const values = [];

    if (userData.name) {
      updateFields.push('name = ?');
      values.push(userData.name);
    }

    if (userData.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(userData.email, id);
      if (existing) {
        throw new Error('Email already in use.');
      }
      updateFields.push('email = ?');
      values.push(userData.email);
    }

    if (userData.password) {
      updateFields.push('password = ?');
      values.push(bcrypt.hashSync(userData.password, 10));
    }

    if (userData.role) {
      updateFields.push('role = ?');
      values.push(userData.role);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update.');
    }

    updateFields.push('updated_at = datetime("now")');
    values.push(id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    return this.getUserById(id);
  }

  /**
   * Delete user
   */
  deleteUser(id) {
    const user = this.getUserById(id);

    // Prevent deleting admin
    if (user.role === 'ADMIN') {
      throw new Error('Cannot delete admin user.');
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { message: 'User deleted successfully.' };
  }

  /**
   * Bulk import students from Excel data
   */
  bulkImportStudents(studentsData, createdBy) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      students: []
    };

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((students) => {
      for (const studentData of students) {
        try {
          // Validate required fields
          if (!studentData.email || !studentData.password) {
            results.failed++;
            results.errors.push({
              email: studentData.email || 'Unknown',
              error: 'Email and password are required'
            });
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(studentData.email)) {
            results.failed++;
            results.errors.push({
              email: studentData.email,
              error: 'Invalid email format'
            });
            continue;
          }

          // Validate password strength
          if (studentData.password.length < 8) {
            results.failed++;
            results.errors.push({
              email: studentData.email,
              error: 'Password must be at least 8 characters'
            });
            continue;
          }
          if (!/[A-Z]/.test(studentData.password)) {
            results.failed++;
            results.errors.push({
              email: studentData.email,
              error: 'Password must contain at least one uppercase letter'
            });
            continue;
          }
          if (!/[0-9]/.test(studentData.password)) {
            results.failed++;
            results.errors.push({
              email: studentData.email,
              error: 'Password must contain at least one number'
            });
            continue;
          }

          // Check if user already exists
          const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(studentData.email);
          if (existingUser) {
            results.failed++;
            results.errors.push({
              email: studentData.email,
              error: 'User already exists'
            });
            continue;
          }

          // Create user
          const userId = uuidv4();
          const hashedPassword = bcrypt.hashSync(studentData.password, 10);
          const name = studentData.name || '';

          insertUser.run(userId, studentData.email, hashedPassword, name, 'STUDENT');

          results.success++;
          results.students.push({
            id: userId,
            email: studentData.email,
            name: name
          });
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: studentData.email || 'Unknown',
            error: error.message
          });
        }
      }
    });

    insertMany(studentsData);
    return results;
  }
}

module.exports = new AuthService();

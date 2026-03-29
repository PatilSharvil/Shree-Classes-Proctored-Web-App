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
        role: user.role
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
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, env.adminEmail, hashedPassword, 'Admin', 'ADMIN');

    console.log('Default admin user created');
    return { id: adminId, email: env.adminEmail, role: 'ADMIN' };
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
}

module.exports = new AuthService();

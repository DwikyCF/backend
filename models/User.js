/**
 * User Model
 * Model untuk tabel users - handle authentication dan user management
 */

const db = require('../config/database');

class User {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT id as user_id, email, password, role, is_active, created_at FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    const [rows] = await db.query(
      'SELECT id as user_id, email, role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    return rows[0];
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { email, password, role = 'customer' } = userData;
    
    const [result] = await db.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, password, role]
    );
    
    return result.insertId;
  }

  /**
   * Update user
   */
  static async update(userId, userData) {
    const fields = [];
    const values = [];
    
    Object.keys(userData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(userData[key]);
    });
    
    values.push(userId);
    
    const [result] = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update password
   */
  static async updatePassword(userId, newPassword) {
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [newPassword, userId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Soft delete user (set is_active = 0)
   */
  static async softDelete(userId) {
    const [result] = await db.query(
      'UPDATE users SET is_active = 0 WHERE user_id = ?',
      [userId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get all users with pagination
   */
  static async getAll(limit, offset, role = null) {
    let query = 'SELECT user_id, email, role, is_active, created_at FROM users';
    const params = [];
    
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count users
   */
  static async count(role = null) {
    let query = 'SELECT COUNT(*) as total FROM users';
    const params = [];
    
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }
}

module.exports = User;

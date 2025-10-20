/**
 * Customer Model
 * Model untuk tabel customers - profile dan loyalty management
 */

const db = require('../config/database');

class Customer {
  /**
   * Find customer by user ID
   */
  static async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT c.*, u.email 
       FROM customers c 
       JOIN users u ON c.user_id = u.user_id 
       WHERE c.user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  /**
   * Find customer by ID
   */
  static async findById(customerId) {
    const [rows] = await db.query(
      `SELECT c.*, u.email 
       FROM customers c 
       JOIN users u ON c.user_id = u.user_id 
       WHERE c.customer_id = ?`,
      [customerId]
    );
    return rows[0];
  }

  /**
   * Create new customer
   */
  static async create(customerData) {
    const {
      user_id,
      full_name,
      phone_number,
      date_of_birth,
      gender,
      address
    } = customerData;
    
    const [result] = await db.query(
      `INSERT INTO customers (user_id, full_name, phone_number, date_of_birth, gender, address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, full_name, phone_number, date_of_birth, gender, address]
    );
    
    return result.insertId;
  }

  /**
   * Update customer
   */
  static async update(customerId, customerData) {
    const fields = [];
    const values = [];
    
    Object.keys(customerData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(customerData[key]);
    });
    
    values.push(customerId);
    
    const [result] = await db.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE customer_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get all customers with pagination
   */
  static async getAll(limit, offset, search = null) {
    let query = `
      SELECT c.*, u.email, u.is_active,
             COUNT(DISTINCT b.booking_id) as total_bookings,
             COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM customers c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN bookings b ON c.customer_id = b.customer_id
      LEFT JOIN transactions t ON b.booking_id = t.booking_id
    `;
    
    const params = [];
    
    if (search) {
      query += ' WHERE (c.full_name LIKE ? OR c.phone_number LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY c.customer_id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count customers
   */
  static async count(search = null) {
    let query = `
      SELECT COUNT(DISTINCT c.customer_id) as total 
      FROM customers c
      JOIN users u ON c.user_id = u.user_id
    `;
    
    const params = [];
    
    if (search) {
      query += ' WHERE (c.full_name LIKE ? OR c.phone_number LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Update loyalty points
   */
  static async updateLoyaltyPoints(customerId, points, operation = 'add') {
    const operator = operation === 'add' ? '+' : '-';
    
    const [result] = await db.query(
      `UPDATE customers SET loyalty_points = loyalty_points ${operator} ? WHERE customer_id = ?`,
      [points, customerId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get customer statistics
   */
  static async getStatistics(customerId) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(b.booking_id) as total_bookings,
         COALESCE(SUM(t.total_amount), 0) as total_spent,
         AVG(r.rating) as average_rating
       FROM customers c
       LEFT JOIN bookings b ON c.customer_id = b.customer_id
       LEFT JOIN transactions t ON b.booking_id = t.booking_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE c.customer_id = ?
       GROUP BY c.customer_id`,
      [customerId]
    );
    
    return rows[0] || { total_bookings: 0, total_spent: 0, average_rating: 0 };
  }

  /**
   * Get loyalty transaction history
   */
  static async getLoyaltyHistory(customerId, limit, offset) {
    const [rows] = await db.query(
      `SELECT * FROM loyalty_transactions 
       WHERE customer_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [customerId, limit, offset]
    );
    
    return rows;
  }
}

module.exports = Customer;

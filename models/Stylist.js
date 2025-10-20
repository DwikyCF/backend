/**
 * Stylist Model
 * Model untuk tabel stylists - data stylist/pegawai
 */

const db = require('../config/database');

class Stylist {
  /**
   * Find stylist by ID
   */
  static async findById(stylistId) {
    const [rows] = await db.query(
      `SELECT s.*, u.email 
       FROM stylists s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.stylist_id = ?`,
      [stylistId]
    );
    return rows[0];
  }

  /**
   * Find stylist by user ID
   */
  static async findByUserId(userId) {
    const [rows] = await db.query(
      'SELECT * FROM stylists WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  /**
   * Get all stylists
   */
  static async getAll(limit, offset, filters = {}) {
    let query = `
      SELECT s.*, u.email, u.is_active,
             COUNT(DISTINCT b.booking_id) as total_bookings,
             COALESCE(AVG(r.rating), 0) as average_rating
      FROM stylists s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN bookings b ON s.stylist_id = b.stylist_id
      LEFT JOIN reviews r ON b.booking_id = r.booking_id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.is_available !== undefined) {
      query += ' AND s.is_available = ?';
      params.push(filters.is_available);
    }
    
    if (filters.search) {
      query += ' AND (s.full_name LIKE ? OR s.specialization LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' GROUP BY s.stylist_id ORDER BY s.full_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count stylists
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM stylists WHERE 1=1';
    const params = [];
    
    if (filters.is_available !== undefined) {
      query += ' AND is_available = ?';
      params.push(filters.is_available);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new stylist
   */
  static async create(stylistData) {
    const {
      user_id,
      full_name,
      phone_number,
      specialization,
      bio,
      photo_url
    } = stylistData;
    
    const [result] = await db.query(
      `INSERT INTO stylists (user_id, full_name, phone_number, specialization, bio, photo_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, full_name, phone_number, specialization, bio, photo_url]
    );
    
    return result.insertId;
  }

  /**
   * Update stylist
   */
  static async update(stylistId, stylistData) {
    const fields = [];
    const values = [];
    
    Object.keys(stylistData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(stylistData[key]);
    });
    
    values.push(stylistId);
    
    const [result] = await db.query(
      `UPDATE stylists SET ${fields.join(', ')} WHERE stylist_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get stylist schedules
   */
  static async getSchedules(stylistId, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT * FROM stylist_schedules 
       WHERE stylist_id = ? 
       AND date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [stylistId, startDate, endDate]
    );
    
    return rows;
  }

  /**
   * Add stylist schedule
   */
  static async addSchedule(scheduleData) {
    const { stylist_id, date, start_time, end_time, is_available } = scheduleData;
    
    const [result] = await db.query(
      `INSERT INTO stylist_schedules (stylist_id, date, start_time, end_time, is_available) 
       VALUES (?, ?, ?, ?, ?)`,
      [stylist_id, date, start_time, end_time, is_available]
    );
    
    return result.insertId;
  }

  /**
   * Get available stylists for date/time
   */
  static async getAvailable(date, time) {
    const [rows] = await db.query(
      `SELECT s.* FROM stylists s
       JOIN stylist_schedules ss ON s.stylist_id = ss.stylist_id
       WHERE s.is_available = 1
       AND ss.date = ?
       AND ss.is_available = 1
       AND ? BETWEEN ss.start_time AND ss.end_time`,
      [date, time]
    );
    
    return rows;
  }

  /**
   * Get stylist performance
   */
  static async getPerformance(stylistId, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(b.booking_id) as total_bookings,
         COALESCE(SUM(t.total_amount), 0) as total_revenue,
         COALESCE(AVG(r.rating), 0) as average_rating,
         COUNT(DISTINCT b.customer_id) as unique_customers
       FROM stylists s
       LEFT JOIN bookings b ON s.stylist_id = b.stylist_id
       LEFT JOIN transactions t ON b.booking_id = t.booking_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE s.stylist_id = ?
       AND b.booking_date BETWEEN ? AND ?
       GROUP BY s.stylist_id`,
      [stylistId, startDate, endDate]
    );
    
    return rows[0] || { total_bookings: 0, total_revenue: 0, average_rating: 0, unique_customers: 0 };
  }
}

module.exports = Stylist;

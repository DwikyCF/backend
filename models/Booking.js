/**
 * Booking Model
 * Model untuk tabel bookings - handle booking appointments
 */

const db = require('../config/database');

class Booking {
  /**
   * Find booking by ID
   */
  static async findById(bookingId) {
    const [rows] = await db.query(
      `SELECT b.*, 
              c.full_name as customer_name, c.phone_number as customer_phone,
              s.full_name as stylist_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       LEFT JOIN stylists s ON b.stylist_id = s.stylist_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    return rows[0];
  }

  /**
   * Find by booking code
   */
  static async findByCode(bookingCode) {
    const [rows] = await db.query(
      `SELECT b.*, 
              c.full_name as customer_name, c.phone_number as customer_phone,
              s.full_name as stylist_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       LEFT JOIN stylists s ON b.stylist_id = s.stylist_id
       WHERE b.booking_code = ?`,
      [bookingCode]
    );
    return rows[0];
  }

  /**
   * Get all bookings with filters
   */
  static async getAll(filters = {}) {
    const { limit, offset, customer_id, stylist_id, status, date_from, date_to, search } = filters;
    
    let query = `
      SELECT b.*, 
             c.full_name as customer_name, c.phone_number as customer_phone,
             s.full_name as stylist_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN stylists s ON b.stylist_id = s.stylist_id
      WHERE 1=1
    `;
    const params = [];
    
    if (customer_id) {
      query += ' AND b.customer_id = ?';
      params.push(customer_id);
    }
    
    if (stylist_id) {
      query += ' AND b.stylist_id = ?';
      params.push(stylist_id);
    }
    
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    
    if (date_from && date_to) {
      query += ' AND b.booking_date BETWEEN ? AND ?';
      params.push(date_from, date_to);
    }
    
    if (search) {
      query += ' AND (b.booking_code LIKE ? OR c.full_name LIKE ? OR s.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY b.booking_date DESC, b.booking_time DESC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count bookings
   */
  static async count(filters = {}) {
    const { customer_id, stylist_id, status, date_from, date_to } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM bookings WHERE 1=1';
    const params = [];
    
    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(customer_id);
    }
    
    if (stylist_id) {
      query += ' AND stylist_id = ?';
      params.push(stylist_id);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (date_from && date_to) {
      query += ' AND booking_date BETWEEN ? AND ?';
      params.push(date_from, date_to);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new booking
   */
  static async create(bookingData) {
    const {
      customer_id,
      stylist_id,
      booking_code,
      booking_date,
      booking_time,
      total_duration,
      total_price,
      notes
    } = bookingData;
    
    const [result] = await db.query(
      `INSERT INTO bookings 
       (customer_id, stylist_id, booking_code, booking_date, booking_time, total_duration, total_price, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, stylist_id, booking_code, booking_date, booking_time, total_duration, total_price, notes]
    );
    
    return result.insertId;
  }

  /**
   * Add services to booking
   */
  static async addServices(bookingId, services) {
    const values = services.map(s => [bookingId, s.service_id, s.price, s.duration]);
    
    await db.query(
      `INSERT INTO booking_services (booking_id, service_id, price, duration) VALUES ?`,
      [values]
    );
  }

  /**
   * Get booking services
   */
  static async getServices(bookingId) {
    const [rows] = await db.query(
      `SELECT bs.*, s.service_name, s.description
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.service_id
       WHERE bs.booking_id = ?`,
      [bookingId]
    );
    
    return rows;
  }

  /**
   * Update booking status
   */
  static async updateStatus(bookingId, status) {
    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      [status, bookingId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update booking
   */
  static async update(bookingId, bookingData) {
    const fields = [];
    const values = [];
    
    Object.keys(bookingData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(bookingData[key]);
    });
    
    values.push(bookingId);
    
    const [result] = await db.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE booking_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Cancel booking
   */
  static async cancel(bookingId) {
    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      ['cancelled', bookingId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get upcoming bookings for reminders
   */
  static async getUpcoming(date) {
    const [rows] = await db.query(
      `SELECT b.*, c.full_name as customer_name, u.email as customer_email
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       WHERE b.booking_date = ?
       AND b.status = 'confirmed'`,
      [date]
    );
    
    return rows;
  }

  /**
   * Check if time slot is available
   */
  static async checkAvailability(stylistId, date, startTime, endTime) {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM bookings
       WHERE stylist_id = ?
       AND booking_date = ?
       AND status IN ('pending', 'confirmed')
       AND (
         (booking_time <= ? AND DATE_ADD(booking_time, INTERVAL total_duration MINUTE) > ?) OR
         (booking_time < ? AND DATE_ADD(booking_time, INTERVAL total_duration MINUTE) >= ?) OR
         (booking_time >= ? AND booking_time < ?)
       )`,
      [stylistId, date, startTime, startTime, endTime, endTime, startTime, endTime]
    );
    
    return rows[0].count === 0;
  }
}

module.exports = Booking;

/**
 * Review Model
 * Model untuk tabel reviews - rating dan ulasan customer
 */

const db = require('../config/database');

class Review {
  /**
   * Find review by ID
   */
  static async findById(reviewId) {
    const [rows] = await db.query(
      `SELECT r.*, c.full_name as customer_name, s.full_name as stylist_name, b.booking_code
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       JOIN customers c ON r.customer_id = c.customer_id
       LEFT JOIN stylists s ON r.stylist_id = s.stylist_id
       WHERE r.review_id = ?`,
      [reviewId]
    );
    return rows[0];
  }

  /**
   * Get all reviews
   */
  static async getAll(filters = {}) {
    const { limit, offset, stylist_id, rating, is_visible, search } = filters;
    
    let query = `
      SELECT r.*, c.full_name as customer_name, s.full_name as stylist_name, b.booking_code
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.booking_id
      JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN stylists s ON r.stylist_id = s.stylist_id
      WHERE 1=1
    `;
    const params = [];
    
    if (stylist_id) {
      query += ' AND r.stylist_id = ?';
      params.push(stylist_id);
    }
    
    if (rating) {
      query += ' AND r.rating = ?';
      params.push(rating);
    }
    
    if (is_visible !== undefined) {
      query += ' AND r.is_visible = ?';
      params.push(is_visible);
    }
    
    if (search) {
      query += ' AND (r.comment LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count reviews
   */
  static async count(filters = {}) {
    const { stylist_id, rating, is_visible } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM reviews WHERE 1=1';
    const params = [];
    
    if (stylist_id) {
      query += ' AND stylist_id = ?';
      params.push(stylist_id);
    }
    
    if (rating) {
      query += ' AND rating = ?';
      params.push(rating);
    }
    
    if (is_visible !== undefined) {
      query += ' AND is_visible = ?';
      params.push(is_visible);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new review
   */
  static async create(reviewData) {
    const {
      booking_id,
      customer_id,
      stylist_id,
      rating,
      comment,
      image_urls
    } = reviewData;
    
    const [result] = await db.query(
      `INSERT INTO reviews (booking_id, customer_id, stylist_id, rating, comment, image_urls) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [booking_id, customer_id, stylist_id, rating, comment, image_urls]
    );
    
    return result.insertId;
  }

  /**
   * Update review
   */
  static async update(reviewId, reviewData) {
    const fields = [];
    const values = [];
    
    Object.keys(reviewData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(reviewData[key]);
    });
    
    values.push(reviewId);
    
    const [result] = await db.query(
      `UPDATE reviews SET ${fields.join(', ')} WHERE review_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Toggle visibility
   */
  static async toggleVisibility(reviewId) {
    const [result] = await db.query(
      'UPDATE reviews SET is_visible = NOT is_visible WHERE review_id = ?',
      [reviewId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get average rating
   */
  static async getAverageRating(stylistId = null) {
    let query = 'SELECT AVG(rating) as average_rating FROM reviews WHERE is_visible = 1';
    const params = [];
    
    if (stylistId) {
      query += ' AND stylist_id = ?';
      params.push(stylistId);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].average_rating || 0;
  }

  /**
   * Get rating distribution
   */
  static async getRatingDistribution(stylistId = null) {
    let query = `
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE is_visible = 1
    `;
    const params = [];
    
    if (stylistId) {
      query += ' AND stylist_id = ?';
      params.push(stylistId);
    }
    
    query += ' GROUP BY rating ORDER BY rating DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Check if customer can review
   */
  static async canReview(customerId, bookingId) {
    // Check if booking is completed
    const [booking] = await db.query(
      'SELECT status FROM bookings WHERE booking_id = ? AND customer_id = ?',
      [bookingId, customerId]
    );
    
    if (!booking[0] || booking[0].status !== 'completed') {
      return false;
    }
    
    // Check if already reviewed
    const [existing] = await db.query(
      'SELECT review_id FROM reviews WHERE booking_id = ? AND customer_id = ?',
      [bookingId, customerId]
    );
    
    return existing.length === 0;
  }
}

module.exports = Review;

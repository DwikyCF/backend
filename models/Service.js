/**
 * Service Model
 * Model untuk tabel services - layanan salon
 */

const db = require('../config/database');

class Service {
  /**
   * Find service by ID
   */
  static async findById(serviceId) {
    const [rows] = await db.query(
      `SELECT s.*, sc.category_name 
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.category_id
       WHERE s.service_id = ?`,
      [serviceId]
    );
    return rows[0];
  }

  /**
   * Get all services with filters
   */
  static async getAll(filters = {}) {
    const { limit, offset, category_id, is_active, search } = filters;
    
    let query = `
      SELECT s.*, sc.category_name 
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.category_id
      WHERE 1=1
    `;
    const params = [];
    
    if (category_id) {
      query += ' AND s.category_id = ?';
      params.push(category_id);
    }
    
    if (is_active !== undefined) {
      query += ' AND s.is_active = ?';
      params.push(is_active);
    }
    
    if (search) {
      query += ' AND (s.service_name LIKE ? OR s.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY s.service_name ASC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count services
   */
  static async count(filters = {}) {
    const { category_id, is_active, search } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM services WHERE 1=1';
    const params = [];
    
    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active);
    }
    
    if (search) {
      query += ' AND (service_name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new service
   */
  static async create(serviceData) {
    const {
      category_id,
      service_name,
      description,
      price,
      duration_minutes,
      image_url
    } = serviceData;
    
    const [result] = await db.query(
      `INSERT INTO services (category_id, service_name, description, price, duration_minutes, image_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category_id, service_name, description, price, duration_minutes, image_url]
    );
    
    return result.insertId;
  }

  /**
   * Update service
   */
  static async update(serviceId, serviceData) {
    const fields = [];
    const values = [];
    
    Object.keys(serviceData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(serviceData[key]);
    });
    
    values.push(serviceId);
    
    const [result] = await db.query(
      `UPDATE services SET ${fields.join(', ')} WHERE service_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Delete service
   */
  static async delete(serviceId) {
    const [result] = await db.query(
      'DELETE FROM services WHERE service_id = ?',
      [serviceId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Toggle service active status
   */
  static async toggleActive(serviceId) {
    const [result] = await db.query(
      'UPDATE services SET is_active = NOT is_active WHERE service_id = ?',
      [serviceId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get popular services
   */
  static async getPopular(limit = 10) {
    const [rows] = await db.query(
      `SELECT s.*, sc.category_name, COUNT(bs.service_id) as booking_count
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.category_id
       LEFT JOIN booking_services bs ON s.service_id = bs.service_id
       WHERE s.is_active = 1
       GROUP BY s.service_id
       ORDER BY booking_count DESC
       LIMIT ?`,
      [limit]
    );
    
    return rows;
  }

  /**
   * Get service categories
   */
  static async getCategories() {
    const [rows] = await db.query(
      'SELECT * FROM service_categories ORDER BY category_name ASC'
    );
    
    return rows;
  }

  /**
   * Get services by multiple IDs
   */
  static async getByIds(serviceIds) {
    if (!serviceIds || serviceIds.length === 0) return [];
    
    const placeholders = serviceIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT * FROM services WHERE service_id IN (${placeholders})`,
      serviceIds
    );
    
    return rows;
  }
}

module.exports = Service;

/**
 * Transaction Model
 * Model untuk tabel transactions - payment dan invoice
 */

const db = require('../config/database');

class Transaction {
  /**
   * Find transaction by ID
   */
  static async findById(transactionId) {
    const [rows] = await db.query(
      `SELECT t.*, b.booking_code, c.full_name as customer_name
       FROM transactions t
       JOIN bookings b ON t.booking_id = b.booking_id
       JOIN customers c ON b.customer_id = c.customer_id
       WHERE t.transaction_id = ?`,
      [transactionId]
    );
    return rows[0];
  }

  /**
   * Find by invoice number
   */
  static async findByInvoice(invoiceNumber) {
    const [rows] = await db.query(
      `SELECT t.*, b.booking_code, c.full_name as customer_name
       FROM transactions t
       JOIN bookings b ON t.booking_id = b.booking_id
       JOIN customers c ON b.customer_id = c.customer_id
       WHERE t.invoice_number = ?`,
      [invoiceNumber]
    );
    return rows[0];
  }

  /**
   * Find by booking ID
   */
  static async findByBookingId(bookingId) {
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE booking_id = ?',
      [bookingId]
    );
    return rows[0];
  }

  /**
   * Get all transactions
   */
  static async getAll(filters = {}) {
    const { limit, offset, payment_status, payment_method, date_from, date_to, search } = filters;
    
    let query = `
      SELECT t.*, b.booking_code, c.full_name as customer_name
      FROM transactions t
      JOIN bookings b ON t.booking_id = b.booking_id
      JOIN customers c ON b.customer_id = c.customer_id
      WHERE 1=1
    `;
    const params = [];
    
    if (payment_status) {
      query += ' AND t.payment_status = ?';
      params.push(payment_status);
    }
    
    if (payment_method) {
      query += ' AND t.payment_method = ?';
      params.push(payment_method);
    }
    
    if (date_from && date_to) {
      query += ' AND DATE(t.payment_date) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    }
    
    if (search) {
      query += ' AND (t.invoice_number LIKE ? OR b.booking_code LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY t.payment_date DESC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count transactions
   */
  static async count(filters = {}) {
    const { payment_status, payment_method, date_from, date_to } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    const params = [];
    
    if (payment_status) {
      query += ' AND payment_status = ?';
      params.push(payment_status);
    }
    
    if (payment_method) {
      query += ' AND payment_method = ?';
      params.push(payment_method);
    }
    
    if (date_from && date_to) {
      query += ' AND DATE(payment_date) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new transaction
   */
  static async create(transactionData) {
    const {
      booking_id,
      invoice_number,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      payment_method,
      payment_status,
      payment_date,
      payment_proof_url,
      voucher_id
    } = transactionData;
    
    const [result] = await db.query(
      `INSERT INTO transactions 
       (booking_id, invoice_number, subtotal, discount_amount, tax_amount, total_amount, 
        payment_method, payment_status, payment_date, payment_proof_url, voucher_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id, invoice_number, subtotal, discount_amount, tax_amount, total_amount,
       payment_method, payment_status, payment_date, payment_proof_url, voucher_id]
    );
    
    return result.insertId;
  }

  /**
   * Update transaction
   */
  static async update(transactionId, transactionData) {
    const fields = [];
    const values = [];
    
    Object.keys(transactionData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(transactionData[key]);
    });
    
    values.push(transactionId);
    
    const [result] = await db.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE transaction_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(transactionId, status) {
    const [result] = await db.query(
      'UPDATE transactions SET payment_status = ? WHERE transaction_id = ?',
      [status, transactionId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get revenue statistics
   */
  static async getRevenue(startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(total_amount), 0) as total_revenue,
         COALESCE(AVG(total_amount), 0) as average_transaction,
         COALESCE(SUM(discount_amount), 0) as total_discounts
       FROM transactions
       WHERE payment_status = 'paid'
       AND DATE(payment_date) BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    
    return rows[0];
  }

  /**
   * Get daily revenue
   */
  static async getDailyRevenue(startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         DATE(payment_date) as date,
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as revenue
       FROM transactions
       WHERE payment_status = 'paid'
       AND DATE(payment_date) BETWEEN ? AND ?
       GROUP BY DATE(payment_date)
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    
    return rows;
  }

  /**
   * Get payment method breakdown
   */
  static async getPaymentMethodBreakdown(startDate, endDate) {
    const [rows] = await db.query(
      `SELECT 
         payment_method,
         COUNT(*) as count,
         COALESCE(SUM(total_amount), 0) as total
       FROM transactions
       WHERE payment_status = 'paid'
       AND DATE(payment_date) BETWEEN ? AND ?
       GROUP BY payment_method`,
      [startDate, endDate]
    );
    
    return rows;
  }
}

module.exports = Transaction;

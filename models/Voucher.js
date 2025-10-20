/**
 * Voucher Model
 * Model untuk tabel vouchers - promo dan diskon
 */

const db = require('../config/database');

class Voucher {
  /**
   * Find voucher by code
   */
  static async findByCode(code) {
    const [rows] = await db.query(
      'SELECT * FROM vouchers WHERE voucher_code = ?',
      [code]
    );
    return rows[0];
  }

  /**
   * Find voucher by ID
   */
  static async findById(voucherId) {
    const [rows] = await db.query(
      'SELECT * FROM vouchers WHERE voucher_id = ?',
      [voucherId]
    );
    return rows[0];
  }

  /**
   * Get all vouchers
   */
  static async getAll(filters = {}) {
    const { limit, offset, is_active, search } = filters;
    
    let query = 'SELECT * FROM vouchers WHERE 1=1';
    const params = [];
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active);
    }
    
    if (search) {
      query += ' AND (voucher_code LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count vouchers
   */
  static async count(filters = {}) {
    const { is_active } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM vouchers WHERE 1=1';
    const params = [];
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new voucher
   */
  static async create(voucherData) {
    const {
      voucher_code,
      description,
      discount_type,
      discount_value,
      min_transaction,
      max_discount,
      usage_limit,
      valid_from,
      valid_until
    } = voucherData;
    
    const [result] = await db.query(
      `INSERT INTO vouchers 
       (voucher_code, description, discount_type, discount_value, min_transaction, 
        max_discount, usage_limit, valid_from, valid_until) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [voucher_code, description, discount_type, discount_value, min_transaction,
       max_discount, usage_limit, valid_from, valid_until]
    );
    
    return result.insertId;
  }

  /**
   * Update voucher
   */
  static async update(voucherId, voucherData) {
    const fields = [];
    const values = [];
    
    Object.keys(voucherData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(voucherData[key]);
    });
    
    values.push(voucherId);
    
    const [result] = await db.query(
      `UPDATE vouchers SET ${fields.join(', ')} WHERE voucher_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Delete voucher
   */
  static async delete(voucherId) {
    const [result] = await db.query(
      'DELETE FROM vouchers WHERE voucher_id = ?',
      [voucherId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Toggle active status
   */
  static async toggleActive(voucherId) {
    const [result] = await db.query(
      'UPDATE vouchers SET is_active = NOT is_active WHERE voucher_id = ?',
      [voucherId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Validate voucher
   */
  static async validate(code, transactionAmount, customerId) {
    const voucher = await this.findByCode(code);
    
    if (!voucher) {
      return { valid: false, message: 'Voucher not found' };
    }
    
    if (!voucher.is_active) {
      return { valid: false, message: 'Voucher is inactive' };
    }
    
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);
    
    if (now < validFrom) {
      return { valid: false, message: 'Voucher not yet valid' };
    }
    
    if (now > validUntil) {
      return { valid: false, message: 'Voucher has expired' };
    }
    
    if (transactionAmount < voucher.min_transaction) {
      return { 
        valid: false, 
        message: `Minimum transaction is ${voucher.min_transaction}` 
      };
    }
    
    if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
      return { valid: false, message: 'Voucher usage limit reached' };
    }
    
    // Check customer usage if per_customer_limit is set
    if (voucher.per_customer_limit) {
      const [usage] = await db.query(
        'SELECT COUNT(*) as count FROM voucher_usage WHERE voucher_id = ? AND customer_id = ?',
        [voucher.voucher_id, customerId]
      );
      
      if (usage[0].count >= voucher.per_customer_limit) {
        return { valid: false, message: 'You have reached the usage limit for this voucher' };
      }
    }
    
    return { valid: true, voucher };
  }

  /**
   * Record voucher usage
   */
  static async recordUsage(voucherId, customerId, transactionId, discountAmount) {
    const [result] = await db.query(
      `INSERT INTO voucher_usage (voucher_id, customer_id, transaction_id, discount_amount) 
       VALUES (?, ?, ?, ?)`,
      [voucherId, customerId, transactionId, discountAmount]
    );
    
    // Increment usage count
    await db.query(
      'UPDATE vouchers SET usage_count = usage_count + 1 WHERE voucher_id = ?',
      [voucherId]
    );
    
    return result.insertId;
  }

  /**
   * Get voucher usage history
   */
  static async getUsageHistory(voucherId, limit, offset) {
    const [rows] = await db.query(
      `SELECT vu.*, c.full_name as customer_name, t.invoice_number
       FROM voucher_usage vu
       JOIN customers c ON vu.customer_id = c.customer_id
       LEFT JOIN transactions t ON vu.transaction_id = t.transaction_id
       WHERE vu.voucher_id = ?
       ORDER BY vu.used_at DESC
       LIMIT ? OFFSET ?`,
      [voucherId, limit, offset]
    );
    
    return rows;
  }

  /**
   * Get active vouchers for customer
   */
  static async getActiveForCustomer(customerId) {
    const now = new Date().toISOString().split('T')[0];
    
    const [rows] = await db.query(
      `SELECT v.*, 
              COALESCE(vu_count.count, 0) as customer_usage_count
       FROM vouchers v
       LEFT JOIN (
         SELECT voucher_id, COUNT(*) as count 
         FROM voucher_usage 
         WHERE customer_id = ?
         GROUP BY voucher_id
       ) vu_count ON v.voucher_id = vu_count.voucher_id
       WHERE v.is_active = 1
       AND v.valid_from <= ?
       AND v.valid_until >= ?
       AND (v.usage_limit IS NULL OR v.usage_count < v.usage_limit)
       AND (v.per_customer_limit IS NULL OR COALESCE(vu_count.count, 0) < v.per_customer_limit)
       ORDER BY v.discount_value DESC`,
      [customerId, now, now]
    );
    
    return rows;
  }
}

module.exports = Voucher;

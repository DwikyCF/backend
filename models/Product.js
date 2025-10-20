/**
 * Product Model
 * Model untuk tabel products - retail products
 */

const db = require('../config/database');

class Product {
  /**
   * Find product by ID
   */
  static async findById(productId) {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE product_id = ?',
      [productId]
    );
    return rows[0];
  }

  /**
   * Get all products
   */
  static async getAll(filters = {}) {
    const { limit, offset, is_available, search } = filters;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (is_available !== undefined) {
      query += ' AND is_available = ?';
      params.push(is_available);
    }
    
    if (search) {
      query += ' AND (product_name LIKE ? OR description LIKE ? OR brand LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY product_name ASC';
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset || 0);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count products
   */
  static async count(filters = {}) {
    const { is_available, search } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];
    
    if (is_available !== undefined) {
      query += ' AND is_available = ?';
      params.push(is_available);
    }
    
    if (search) {
      query += ' AND (product_name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Create new product
   */
  static async create(productData) {
    const {
      product_name,
      description,
      brand,
      price,
      stock_quantity,
      min_stock_alert,
      image_url
    } = productData;
    
    const [result] = await db.query(
      `INSERT INTO products 
       (product_name, description, brand, price, stock_quantity, min_stock_alert, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_name, description, brand, price, stock_quantity, min_stock_alert, image_url]
    );
    
    return result.insertId;
  }

  /**
   * Update product
   */
  static async update(productId, productData) {
    const fields = [];
    const values = [];
    
    Object.keys(productData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(productData[key]);
    });
    
    values.push(productId);
    
    const [result] = await db.query(
      `UPDATE products SET ${fields.join(', ')} WHERE product_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Delete product
   */
  static async delete(productId) {
    const [result] = await db.query(
      'DELETE FROM products WHERE product_id = ?',
      [productId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update stock
   */
  static async updateStock(productId, quantity, operation = 'subtract') {
    const operator = operation === 'add' ? '+' : '-';
    
    const [result] = await db.query(
      `UPDATE products SET stock_quantity = stock_quantity ${operator} ? WHERE product_id = ?`,
      [quantity, productId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get low stock products
   */
  static async getLowStock() {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE stock_quantity <= min_stock_alert AND is_available = 1'
    );
    
    return rows;
  }

  /**
   * Record product sale
   */
  static async recordSale(saleData) {
    const { product_id, quantity, sale_price, transaction_id } = saleData;
    
    const [result] = await db.query(
      `INSERT INTO product_sales (product_id, quantity, sale_price, transaction_id) 
       VALUES (?, ?, ?, ?)`,
      [product_id, quantity, sale_price, transaction_id]
    );
    
    return result.insertId;
  }

  /**
   * Get sales history
   */
  static async getSalesHistory(productId, limit, offset) {
    const [rows] = await db.query(
      `SELECT ps.*, t.invoice_number, t.payment_date
       FROM product_sales ps
       LEFT JOIN transactions t ON ps.transaction_id = t.transaction_id
       WHERE ps.product_id = ?
       ORDER BY ps.sale_date DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );
    
    return rows;
  }
}

module.exports = Product;

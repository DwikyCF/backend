/**
 * Service Controller
 * Handle CRUD operations for services
 */

const db = require('../config/database');

/**
 * Get all services
 * GET /api/services
 */
exports.getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 100, category_id, is_active, search } = req.query;
    
    let query = `
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.description,
        s.price,
        s.duration,
        s.category_id,
        sc.name as category_name,
        s.image as image_url,
        s.is_active
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by category
    if (category_id) {
      query += ' AND s.category_id = ?';
      params.push(category_id);
    }
    
    // Filter by active status
    if (is_active !== undefined) {
      query += ' AND s.is_active = ?';
      params.push(parseInt(is_active));
    }
    
    // Search by name
    if (search) {
      query += ' AND s.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY s.category_id, s.name';
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [services] = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM services s WHERE 1=1';
    const countParams = [];
    
    if (category_id) {
      countQuery += ' AND s.category_id = ?';
      countParams.push(category_id);
    }
    
    if (is_active !== undefined) {
      countQuery += ' AND s.is_active = ?';
      countParams.push(parseInt(is_active));
    }
    
    if (search) {
      countQuery += ' AND s.name LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: services,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('❌ Get all services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get service by ID
 * GET /api/services/:id
 */
exports.getServiceById = async (req, res) => {
  try {
    const [services] = await db.query(`
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.description,
        s.price,
        s.duration,
        s.category_id,
        sc.name as category_name,
        s.image as image_url,
        s.is_active
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.json({
      success: true,
      data: services[0],
    });
  } catch (error) {
    console.error('❌ Get service by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get service categories
 * GET /api/services/categories
 */
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        sc.id as category_id,
        sc.name as category_name,
        sc.description,
        COUNT(s.id) as service_count
      FROM service_categories sc
      LEFT JOIN services s ON sc.id = s.category_id AND s.is_active = 1
      GROUP BY sc.id, sc.name, sc.description
      ORDER BY sc.name
    `);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get popular services
 * GET /api/services/popular
 */
exports.getPopularServices = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const [services] = await db.query(`
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.description,
        s.price,
        s.duration,
        sc.name as category_name,
        s.image as image_url,
        COUNT(bs.booking_id) as booking_count
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      LEFT JOIN booking_services bs ON s.id = bs.service_id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY booking_count DESC, s.name
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('❌ Get popular services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create service (Admin only)
 * POST /api/services
 */
exports.createService = async (req, res) => {
  try {
    const { name, description, price, duration, category_id } = req.body;
    
    const [result] = await db.query(`
      INSERT INTO services (name, description, price, duration, category_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
    `, [name, description, price, duration, category_id]);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: {
        service_id: result.insertId
      }
    });
  } catch (error) {
    console.error('❌ Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update service (Admin only)
 * PUT /api/services/:id
 */
exports.updateService = async (req, res) => {
  try {
    const { name, description, price, duration, category_id, is_active } = req.body;
    
    await db.query(`
      UPDATE services 
      SET name = ?, description = ?, price = ?, duration = ?, category_id = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, description, price, duration, category_id, is_active, req.params.id]);
    
    res.json({
      success: true,
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('❌ Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete service (Admin only)
 * DELETE /api/services/:id
 */
exports.deleteService = async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Toggle service active status (Admin only)
 * PATCH /api/services/:id/toggle-active
 */
exports.toggleActive = async (req, res) => {
  try {
    // Get current status
    const [services] = await db.query('SELECT is_active FROM services WHERE id = ?', [req.params.id]);
    
    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Toggle status
    const newStatus = services[0].is_active === 1 ? 0 : 1;
    
    await db.query(`
      UPDATE services 
      SET is_active = ?, updated_at = NOW()
      WHERE id = ?
    `, [newStatus, req.params.id]);
    
    res.json({
      success: true,
      message: `Service ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      data: {
        is_active: newStatus
      }
    });
  } catch (error) {
    console.error('❌ Toggle active error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

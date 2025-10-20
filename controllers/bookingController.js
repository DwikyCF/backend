/**
 * Booking Controller
 * Handle booking operations
 */

const db = require('../config/database');

/**
 * Create new booking
 * POST /api/bookings
 */
exports.createBooking = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('📝 Create booking - req.user:', req.user);
    console.log('📝 Create booking - req.body:', req.body);
    
    const { 
      service_ids, // Array of service IDs
      stylist_id, 
      booking_date, 
      booking_time, 
      notes 
    } = req.body;
    
    if (!req.user || !req.user.id) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Get customer_id from customers table using user_id, or create if doesn't exist
    let [customers] = await connection.query(
      'SELECT id FROM customers WHERE user_id = ?',
      [req.user.id]
    );
    
    let customer_id;
    
    if (customers.length === 0) {
      // Auto-create customer profile if doesn't exist
      console.log('📝 Creating customer profile for user:', req.user.id);
      const [result] = await connection.query(
        `INSERT INTO customers (user_id, loyalty_points, membership_tier, created_at, updated_at) 
         VALUES (?, 0, 'bronze', NOW(), NOW())`,
        [req.user.id]
      );
      customer_id = result.insertId;
      console.log('✅ Customer profile created:', customer_id);
    } else {
      customer_id = customers[0].id;
    }
    
    // Validate service_ids
    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one service'
      });
    }
    
    // Get services and calculate total
    const [services] = await connection.query(
      'SELECT id, name, price, duration FROM services WHERE id IN (?) AND is_active = 1',
      [service_ids]
    );
    
    if (services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid services selected'
      });
    }
    
    const total_price = services.reduce((sum, service) => sum + parseFloat(service.price), 0);
    const total_duration = services.reduce((sum, service) => sum + parseInt(service.duration), 0);
    
    // Calculate end_time
    const [startHour, startMinute] = booking_time.split(':');
    const endDate = new Date();
    endDate.setHours(parseInt(startHour), parseInt(startMinute) + total_duration);
    const end_time = endDate.toTimeString().slice(0, 5);
    
    // Check if stylist is available (if specified)
    if (stylist_id) {
      const [stylistCheck] = await connection.query(
        `SELECT s.id 
         FROM stylists s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ? AND s.is_available = 1 AND u.is_active = 1`,
        [stylist_id]
      );
      
      if (stylistCheck.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected stylist is not available'
        });
      }
      
      // Check for time conflicts
      const [conflicts] = await connection.query(
        `SELECT id FROM bookings 
         WHERE stylist_id = ? 
         AND booking_date = ? 
         AND status NOT IN ('cancelled', 'no_show')
         AND (
           (booking_time <= ? AND end_time > ?) OR
           (booking_time < ? AND end_time >= ?)
         )`,
        [stylist_id, booking_date, booking_time, booking_time, end_time, end_time]
      );
      
      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Stylist is not available at this time. Please choose another time slot.'
        });
      }
    }
    
    // Insert booking
    const [bookingResult] = await connection.query(
      `INSERT INTO bookings 
       (customer_id, stylist_id, booking_date, booking_time, end_time, status, total_price, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [customer_id, stylist_id || null, booking_date, booking_time, end_time, total_price, notes || null]
    );
    
    const booking_id = bookingResult.insertId;
    
    // Insert booking services
    const bookingServicesData = services.map(service => [
      booking_id,
      service.id,
      service.price
    ]);
    
    await connection.query(
      'INSERT INTO booking_services (booking_id, service_id, price, created_at) VALUES ?',
      [bookingServicesData.map(data => [...data, new Date()])]
    );
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking_id,
        total_price,
        status: 'pending'
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get customer bookings
 * GET /api/bookings
 */
exports.getCustomerBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Get customer_id from customers table, or create if doesn't exist
    let [customers] = await db.query(
      'SELECT id FROM customers WHERE user_id = ?',
      [req.user.id]
    );
    
    let customer_id;
    
    if (customers.length === 0) {
      // Auto-create customer profile if doesn't exist
      const [result] = await db.query(
        `INSERT INTO customers (user_id, loyalty_points, membership_tier, created_at, updated_at) 
         VALUES (?, 0, 'bronze', NOW(), NOW())`,
        [req.user.id]
      );
      customer_id = result.insertId;
      
      // Return empty bookings since this is a new customer
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }
    
    customer_id = customers[0].id;
    
    let query = `
      SELECT 
        b.id as booking_id,
        b.booking_date,
        b.booking_time,
        b.end_time,
        b.status,
        b.total_price,
        b.notes,
        b.created_at,
        u.name as stylist_name,
        s.specialization as stylist_specialization,
        GROUP_CONCAT(CONCAT(sv.name, '|', sv.duration) SEPARATOR ';;') as services
      FROM bookings b
      LEFT JOIN stylists s ON b.stylist_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services sv ON bs.service_id = sv.id
      WHERE b.customer_id = ?
    `;
    
    const params = [customer_id];
    
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY b.id ORDER BY b.booking_date DESC, b.booking_time DESC';
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [bookings] = await db.query(query, params);
    
    // Format services
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      services: booking.services 
        ? booking.services.split(';;').map(s => {
            const [name, duration] = s.split('|');
            return { name, duration: parseInt(duration) };
          })
        : []
    }));
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE customer_id = ?';
    const countParams = [customer_id];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: formattedBookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

/**
 * Get booking by ID
 * GET /api/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking_id = req.params.id;
    
    // Get customer_id
    const [customers] = await db.query(
      'SELECT id FROM customers WHERE user_id = ?',
      [req.user.id]
    );
    
    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer profile not found'
      });
    }
    
    const customer_id = customers[0].id;
    
    const [bookings] = await db.query(
      `SELECT 
        b.*,
        u.name as stylist_name,
        u.phone as stylist_phone,
        s.specialization,
        s.rating as stylist_rating
      FROM bookings b
      LEFT JOIN stylists s ON b.stylist_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE b.id = ? AND b.customer_id = ?`,
      [booking_id, customer_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Get services for this booking
    const [services] = await db.query(
      `SELECT 
        s.id as service_id,
        s.name as service_name,
        s.duration,
        bs.price
      FROM booking_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.booking_id = ?`,
      [booking_id]
    );
    
    const booking = {
      ...bookings[0],
      services
    };
    
    res.json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('❌ Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
};

/**
 * Cancel booking
 * PUT /api/bookings/:id/cancel
 */
exports.cancelBooking = async (req, res) => {
  try {
    const booking_id = req.params.id;
    const { cancellation_reason } = req.body;
    
    // Get customer_id
    const [customers] = await db.query(
      'SELECT id FROM customers WHERE user_id = ?',
      [req.user.id]
    );
    
    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer profile not found'
      });
    }
    
    const customer_id = customers[0].id;
    
    // Check if booking exists and belongs to customer
    const [bookings] = await db.query(
      'SELECT id, status, booking_date FROM bookings WHERE id = ? AND customer_id = ?',
      [booking_id, customer_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const booking = bookings[0];
    
    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled'
      });
    }
    
    // Update booking status
    await db.query(
      `UPDATE bookings 
       SET status = 'cancelled', 
           cancellation_reason = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [cancellation_reason || 'Cancelled by customer', booking_id]
    );
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
    
  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

/**
 * Get available time slots
 * GET /api/bookings/available-slots
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, stylist_id } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    // Get booked slots for the date
    let query = `
      SELECT booking_time, end_time 
      FROM bookings 
      WHERE booking_date = ? 
      AND status NOT IN ('cancelled', 'no_show')
    `;
    
    const params = [date];
    
    if (stylist_id) {
      query += ' AND stylist_id = ?';
      params.push(stylist_id);
    }
    
    const [bookedSlots] = await db.query(query, params);
    
    // Generate available slots (9 AM to 8 PM, 30-minute intervals)
    const slots = [];
    for (let hour = 9; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if slot is available
        const isBooked = bookedSlots.some(slot => {
          return time >= slot.booking_time && time < slot.end_time;
        });
        
        if (!isBooked) {
          slots.push(time);
        }
      }
    }
    
    res.json({
      success: true,
      data: slots
    });
    
  } catch (error) {
    console.error('❌ Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message
    });
  }
};

/**
 * Get available stylists
 * GET /api/bookings/available-stylists
 */
exports.getAvailableStylists = async (req, res) => {
  try {
    const [stylists] = await db.query(
      `SELECT 
        s.id as stylist_id,
        u.name as stylist_name,
        u.avatar,
        s.specialization,
        s.experience_years,
        s.rating,
        s.total_reviews
      FROM stylists s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_available = 1 AND u.is_active = 1
      ORDER BY s.rating DESC, s.total_reviews DESC`
    );
    
    res.json({
      success: true,
      data: stylists
    });
    
  } catch (error) {
    console.error('❌ Get stylists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stylists',
      error: error.message
    });
  }
};

/**
 * ADMIN: Get all bookings
 * GET /api/bookings/admin/all
 */
exports.getAllBookings = async (req, res) => {
  try {
    const { status, date, search } = req.query;
    
    let query = `
      SELECT 
        b.id as booking_id,
        b.booking_date,
        b.booking_time,
        b.status,
        b.total_price,
        b.notes,
        b.created_at,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        c.id as customer_id,
        c.membership_tier,
        c.loyalty_points,
        s.id as stylist_id,
        su.name as stylist_name,
        GROUP_CONCAT(
          CONCAT(
            '{"service_id":', bs.service_id, 
            ',"name":"', serv.name, 
            '","price":', bs.price, 
            ',"duration":', serv.duration, '}'
          ) SEPARATOR '|'
        ) as services
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN stylists s ON b.stylist_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services serv ON bs.service_id = serv.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status && status !== 'all') {
      query += ' AND b.status = ?';
      params.push(status);
    }
    
    if (date) {
      query += ' AND DATE(b.booking_date) = ?';
      params.push(date);
    }
    
    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ' GROUP BY b.id ORDER BY b.booking_date DESC, b.booking_time DESC';
    
    const [bookings] = await db.query(query, params);
    
    // Parse services JSON
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      services: booking.services 
        ? booking.services.split('|').map(s => JSON.parse(s))
        : []
    }));
    
    res.json({
      success: true,
      data: formattedBookings
    });
    
  } catch (error) {
    console.error('❌ Admin get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

/**
 * ADMIN: Update booking status
 * PUT /api/bookings/admin/:id/status
 */
exports.updateBookingStatus = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status, stylist_id } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, confirmed, completed, or cancelled'
      });
    }
    
    // Check if booking exists
    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );
    
    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Update booking
    let updateQuery = 'UPDATE bookings SET status = ?, updated_at = NOW()';
    const params = [status];
    
    if (stylist_id !== undefined) {
      updateQuery += ', stylist_id = ?';
      params.push(stylist_id);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    await connection.query(updateQuery, params);
    
    // If status is 'completed', update customer loyalty points
    if (status === 'completed') {
      const booking = bookings[0];
      const pointsToAdd = Math.floor(booking.total_price / 10000); // 1 point per 10,000
      
      await connection.query(
        'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
        [pointsToAdd, booking.customer_id]
      );
    }

    // Update membership tier based on confirmed + completed bookings
    if (status === 'confirmed' || status === 'completed') {
      const booking = bookings[0];
      
      // Count total confirmed + completed bookings for this customer
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as confirmed_count 
         FROM bookings 
         WHERE customer_id = ? AND status IN ('confirmed', 'completed')`,
        [booking.customer_id]
      );
      
      const confirmedCount = countResult[0].confirmed_count;
      
      // Determine tier: Bronze (0-9), Silver (10-49), Gold (50+)
      let newTier = 'bronze';
      if (confirmedCount >= 50) {
        newTier = 'gold';
      } else if (confirmedCount >= 10) {
        newTier = 'silver';
      }
      
      // Update membership tier
      await connection.query(
        'UPDATE customers SET membership_tier = ? WHERE id = ?',
        [newTier, booking.customer_id]
      );
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ADMIN: Get booking statistics
 * GET /api/bookings/admin/stats
 */
exports.getBookingStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as total_revenue,
        SUM(CASE WHEN DATE(booking_date) = CURDATE() THEN 1 ELSE 0 END) as today_bookings,
        SUM(CASE WHEN WEEK(booking_date) = WEEK(CURDATE()) THEN 1 ELSE 0 END) as week_bookings,
        SUM(CASE WHEN MONTH(booking_date) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as month_bookings
      FROM bookings
    `);
    
    res.json({
      success: true,
      data: stats[0]
    });
    
  } catch (error) {
    console.error('❌ Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics',
      error: error.message
    });
  }
};

module.exports = exports;

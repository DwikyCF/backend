/**
 * Profile Controller
 * Handle customer profile operations
 */

const db = require('../config/database');

/**
 * Get customer profile
 * GET /api/profile
 */
exports.getProfile = async (req, res) => {
  try {
    // Get user and customer data
    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar, u.role, u.created_at,
              c.id as customer_id, c.address, c.loyalty_points, c.membership_tier, 
              c.date_of_birth, c.gender, c.preferences
       FROM users u
       LEFT JOIN customers c ON u.id = c.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // If no customer profile, create one
    if (!user.customer_id) {
      const [result] = await db.query(
        `INSERT INTO customers (user_id, loyalty_points, membership_tier, created_at, updated_at) 
         VALUES (?, 0, 'bronze', NOW(), NOW())`,
        [req.user.id]
      );
      
      user.customer_id = result.insertId;
      user.loyalty_points = 0;
      user.membership_tier = 'bronze';
    }

    // Count confirmed bookings for this customer
    const [bookingStats] = await db.query(
      `SELECT COUNT(*) as confirmed_bookings
       FROM bookings 
       WHERE customer_id = ? AND status IN ('confirmed', 'completed')`,
      [user.customer_id]
    );

    const confirmedBookings = bookingStats[0]?.confirmed_bookings || 0;

    // Determine membership tier based on confirmed bookings
    // Bronze: 0-9 bookings
    // Silver: 10-49 bookings
    // Gold: 50+ bookings
    let newTier = 'bronze';
    if (confirmedBookings >= 50) {
      newTier = 'gold';
    } else if (confirmedBookings >= 10) {
      newTier = 'silver';
    }

    // Update membership tier if changed
    if (user.membership_tier !== newTier) {
      await db.query(
        `UPDATE customers SET membership_tier = ?, updated_at = NOW() WHERE id = ?`,
        [newTier, user.customer_id]
      );
      user.membership_tier = newTier;
    }

    // Add confirmed bookings count to response
    user.confirmed_bookings = confirmedBookings;

    console.log(`📊 Profile for ${user.name}: Tier=${user.membership_tier}, Confirmed Bookings=${confirmedBookings}`);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update customer profile
 * PUT /api/profile
 */
exports.updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { name, phone, address, date_of_birth, gender, preferences } = req.body;

    // Update users table
    await connection.query(
      `UPDATE users 
       SET name = ?, phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, phone, req.user.id]
    );

    // Get or create customer profile
    const [customers] = await connection.query(
      'SELECT id FROM customers WHERE user_id = ?',
      [req.user.id]
    );

    if (customers.length === 0) {
      // Create customer profile
      await connection.query(
        `INSERT INTO customers (user_id, address, date_of_birth, gender, preferences, loyalty_points, membership_tier, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 'bronze', NOW(), NOW())`,
        [req.user.id, address || null, date_of_birth || null, gender || null, preferences || null]
      );
    } else {
      // Update customer profile
      await connection.query(
        `UPDATE customers 
         SET address = ?, date_of_birth = ?, gender = ?, preferences = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [address || null, date_of_birth || null, gender || null, preferences || null, req.user.id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = exports;

/**
 * Authentication Controller
 * Handle register, login, dan password management
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Register new customer
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { email, password, full_name, phone, address, date_of_birth, gender, role } = req.body;
    
    console.log('📝 Registration attempt:', { email, full_name, phone });
    console.log('📝 Full request body:', req.body);
    
    // SECURITY: Block any attempt to register as admin
    // Only customer accounts can be created through registration
    // Admin account is pre-configured in database (admin@salon.com)
    if (role && role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Cannot register with admin privileges. Please register as customer.'
      });
    }
    
    // Validation
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, full_name, phone'
      });
    }

    // Start transaction
    await connection.beginTransaction();

    // Check if email exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with CUSTOMER role (hardcoded for security)
    // All registrations are automatically customers
    // Admin account (admin@salon.com) is the only admin and cannot be created via registration
    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password, phone, role, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'customer', 1, NOW(), NOW())`,
      [full_name, email, hashedPassword, phone]
    );

    const userId = userResult.insertId;

    // Auto-create customer profile with default values
    // Bronze membership with 0 loyalty points
    await connection.query(
      `INSERT INTO customers (user_id, address, loyalty_points, membership_tier, date_of_birth, gender, created_at, updated_at) 
       VALUES (?, ?, 0, 'bronze', ?, ?, NOW(), NOW())`,
      [userId, address || null, date_of_birth || null, gender || null]
    );

    // Commit transaction
    await connection.commit();

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, role: 'customer' },
      process.env.JWT_SECRET || 'salon_management_super_secret_key_2024_change_this_in_production',
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', userId);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          userId,
          email,
          full_name,
          phone,
          role: 'customer'
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Login
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', email);
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const [users] = await db.query(
      'SELECT id as user_id, id, name as full_name, email, password, phone, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'salon_management_super_secret_key_2024_change_this_in_production',
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete user.password;

    console.log('✅ Login successful:', user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id as user_id, id, name as full_name, email, phone, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Logout (client-side only - remove token)
 * POST /api/auth/logout
 */
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

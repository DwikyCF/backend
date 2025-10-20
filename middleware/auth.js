/**
 * Authentication Middleware
 * Middleware untuk verifikasi JWT token dan authorization
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const db = require('../config/database');

/**
 * Verify JWT Token
 * Middleware untuk memverifikasi token di header Authorization
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization denied.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    console.log('🔐 Token decoded:', decoded);
    
    // Get user data from database
    const [users] = await db.query(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    
    console.log('👤 User found:', users.length > 0 ? users[0].id : 'none');

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Authorization denied.',
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authorization denied.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message,
    });
  }
};

/**
 * Check if user is Admin
 * Middleware untuk memastikan user memiliki role admin
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  next();
};

/**
 * Check if user is Customer
 * Middleware untuk memastikan user memiliki role customer
 */
const isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer only.',
    });
  }
  next();
};

/**
 * Check if user is Stylist
 * Middleware untuk memastikan user memiliki role stylist
 */
const isStylist = (req, res, next) => {
  if (req.user.role !== 'stylist') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Stylist only.',
    });
  }
  next();
};

/**
 * Allow multiple roles
 * Middleware untuk memperbolehkan multiple roles
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  isAdmin,
  isCustomer,
  isStylist,
  hasRole,
};

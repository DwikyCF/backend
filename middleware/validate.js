/**
 * Validation Middleware
 * Middleware untuk validasi input menggunakan express-validator
 */

const { validationResult } = require('express-validator');

/**
 * Validate Request
 * Middleware untuk mengecek hasil validasi dari express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  
  next();
};

module.exports = validate;

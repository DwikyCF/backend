/**
 * Utility Functions
 * Helper functions untuk berbagai keperluan
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtConfig = require('../config/jwt');

/**
 * Generate JWT Token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
};

/**
 * Hash Password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare Password
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate Random String
 * Untuk generate kode booking, invoice number, dll
 */
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate Booking Code
 */
const generateBookingCode = () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = generateRandomString(4);
  return `BK${year}${month}${day}${random}`;
};

/**
 * Generate Invoice Number
 */
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = generateRandomString(6);
  return `INV/${year}/${month}/${day}/${random}`;
};

/**
 * Format Currency (IDR)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate Pagination
 */
const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? (page - 1) * limit : 0;
  
  return { limit, offset };
};

/**
 * Get Pagination Data
 */
const getPaginationData = (count, page, limit) => {
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(count / limit);
  
  return {
    totalItems: count,
    totalPages,
    currentPage,
    itemsPerPage: limit,
  };
};

/**
 * Calculate Loyalty Points
 * 1% dari total transaksi = points
 */
const calculateLoyaltyPoints = (amount) => {
  return Math.floor(amount * 0.01);
};

/**
 * Calculate Discount Amount
 */
const calculateDiscount = (subtotal, discountType, discountValue) => {
  if (discountType === 'percentage') {
    return Math.floor(subtotal * (discountValue / 100));
  }
  return discountValue;
};

/**
 * Format Date to MySQL DateTime
 */
const formatMySQLDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Check if time slot is available
 * Helper untuk check slot booking
 */
const isTimeSlotAvailable = (startTime, endTime, existingBookings) => {
  for (const booking of existingBookings) {
    const bookingStart = new Date(booking.booking_time);
    const bookingEnd = new Date(booking.end_time);
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    
    // Check for overlap
    if (
      (newStart >= bookingStart && newStart < bookingEnd) ||
      (newEnd > bookingStart && newEnd <= bookingEnd) ||
      (newStart <= bookingStart && newEnd >= bookingEnd)
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

module.exports = {
  generateToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  generateRandomString,
  generateBookingCode,
  generateInvoiceNumber,
  formatCurrency,
  getPagination,
  getPaginationData,
  calculateLoyaltyPoints,
  calculateDiscount,
  formatMySQLDateTime,
  isTimeSlotAvailable,
  sanitizeFilename,
};

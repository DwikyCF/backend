/**
 * Booking Routes
 * Routes untuk booking management
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { verifyToken, isAdmin, hasRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const bookingValidation = [
  body('booking_date').isDate().withMessage('Valid booking date is required'),
  body('booking_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
  body('service_ids').isArray({ min: 1 }).withMessage('At least one service is required'),
];

// Public routes (for checking availability)
router.get('/available-slots', bookingController.getAvailableSlots);
router.get('/available-stylists', bookingController.getAvailableStylists);

// Protected routes (customer only)
router.use(verifyToken);

router.get('/', bookingController.getCustomerBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingValidation, validate, bookingController.createBooking);
router.put('/:id/cancel', bookingController.cancelBooking);

// Admin routes
router.get('/admin/all', isAdmin, bookingController.getAllBookings);
router.get('/admin/stats', isAdmin, bookingController.getBookingStats);
router.put('/admin/:id/status', isAdmin, bookingController.updateBookingStatus);

module.exports = router;

/**
 * Dashboard Routes
 * Routes untuk admin dashboard
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All dashboard routes are admin only
router.use(verifyToken, isAdmin);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/revenue-chart', dashboardController.getRevenueChart);
router.get('/popular-services', dashboardController.getPopularServicesChart);
router.get('/stylist-performance', dashboardController.getStylistPerformance);
router.get('/booking-status', dashboardController.getBookingStatusBreakdown);
router.get('/customer-growth', dashboardController.getCustomerGrowth);

module.exports = router;

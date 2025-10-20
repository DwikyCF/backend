/**
 * Dashboard Controller
 * Statistics and analytics for admin dashboard
 */

const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  
  // Total customers
  const [customersCount] = await db.query(
    'SELECT COUNT(*) as total FROM customers'
  );
  
  // Total bookings (confirmed + completed only)
  const [totalBookings] = await db.query(
    `SELECT COUNT(*) as total FROM bookings 
     WHERE status IN ('confirmed', 'completed')`
  );
  
  // Total bookings today (confirmed + completed)
  const [todayBookings] = await db.query(
    `SELECT COUNT(*) as total FROM bookings 
     WHERE DATE(booking_date) = ? AND status IN ('confirmed', 'completed')`,
    [today]
  );
  
  // Total revenue (from confirmed + completed bookings)
  const [totalRevenue] = await db.query(
    `SELECT COALESCE(SUM(total_price), 0) as total 
     FROM bookings 
     WHERE status IN ('confirmed', 'completed')`
  );
  
  // Total revenue today (from confirmed + completed bookings)
  const [todayRevenue] = await db.query(
    `SELECT COALESCE(SUM(total_price), 0) as total 
     FROM bookings 
     WHERE status IN ('confirmed', 'completed') AND DATE(booking_date) = ?`,
    [today]
  );
  
  // Total revenue this month (from confirmed + completed bookings)
  const [monthRevenue] = await db.query(
    `SELECT COALESCE(SUM(total_price), 0) as total 
     FROM bookings 
     WHERE status IN ('confirmed', 'completed') AND DATE_FORMAT(booking_date, '%Y-%m') = ?`,
    [thisMonth]
  );
  
  // Pending bookings
  const [pendingBookings] = await db.query(
    'SELECT COUNT(*) as total FROM bookings WHERE status = ?',
    ['pending']
  );
  
  // Confirmed bookings
  const [confirmedBookings] = await db.query(
    'SELECT COUNT(*) as total FROM bookings WHERE status = ?',
    ['confirmed']
  );
  
  // Active services
  const [activeServices] = await db.query(
    'SELECT COUNT(*) as total FROM services'
  );
  
  // Active stylists
  const [activeStylists] = await db.query(
    'SELECT COUNT(*) as total FROM stylists WHERE is_available = 1'
  );
  
  // Recent bookings (last 5)
  const [recentBookings] = await db.query(
    `SELECT 
      b.id as booking_id,
      b.booking_date,
      b.booking_time,
      b.status,
      b.total_price,
      b.created_at,
      u.name as customer_name,
      u.email as customer_email
     FROM bookings b
     JOIN customers c ON b.customer_id = c.id
     JOIN users u ON c.user_id = u.id
     ORDER BY b.created_at DESC
     LIMIT 5`
  );
  
  res.json({
    success: true,
    data: {
      stats: {
        totalCustomers: customersCount[0].total,
        totalBookings: totalBookings[0].total,
        todayBookings: todayBookings[0].total,
        todayRevenue: parseFloat(todayRevenue[0].total),
        totalRevenue: parseFloat(totalRevenue[0].total),
        monthRevenue: parseFloat(monthRevenue[0].total),
        pendingBookings: pendingBookings[0].total,
        confirmedBookings: confirmedBookings[0].total,
        activeServices: activeServices[0].total,
        activeStylists: activeStylists[0].total,
      },
      recentBookings,
    },
  });
});

/**
 * Get revenue chart data
 * GET /api/dashboard/revenue-chart
 */
exports.getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query; // week, month, year
  
  let query;
  let params = [];
  
  if (period === 'week') {
    // Last 7 days
    query = `
      SELECT DATE(payment_date) as date, COALESCE(SUM(total_amount), 0) as revenue
      FROM transactions
      WHERE payment_status = 'paid'
      AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(payment_date)
      ORDER BY date ASC
    `;
  } else if (period === 'month') {
    // Last 30 days
    query = `
      SELECT DATE(payment_date) as date, COALESCE(SUM(total_amount), 0) as revenue
      FROM transactions
      WHERE payment_status = 'paid'
      AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(payment_date)
      ORDER BY date ASC
    `;
  } else if (period === 'year') {
    // Last 12 months
    query = `
      SELECT DATE_FORMAT(payment_date, '%Y-%m') as date, COALESCE(SUM(total_amount), 0) as revenue
      FROM transactions
      WHERE payment_status = 'paid'
      AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY date ASC
    `;
  }
  
  const [chartData] = await db.query(query, params);
  
  res.json({
    success: true,
    data: chartData,
  });
});

/**
 * Get popular services chart
 * GET /api/dashboard/popular-services
 */
exports.getPopularServicesChart = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  
  const [data] = await db.query(
    `SELECT s.service_name, COUNT(bs.service_id) as booking_count
     FROM services s
     LEFT JOIN booking_services bs ON s.service_id = bs.service_id
     GROUP BY s.service_id
     ORDER BY booking_count DESC
     LIMIT ?`,
    [parseInt(limit)]
  );
  
  res.json({
    success: true,
    data,
  });
});

/**
 * Get stylist performance
 * GET /api/dashboard/stylist-performance
 */
exports.getStylistPerformance = asyncHandler(async (req, res) => {
  const [data] = await db.query(
    `SELECT 
       s.stylist_id,
       s.full_name,
       COUNT(DISTINCT b.booking_id) as total_bookings,
       COALESCE(AVG(r.rating), 0) as average_rating,
       COALESCE(SUM(t.total_amount), 0) as total_revenue
     FROM stylists s
     LEFT JOIN bookings b ON s.stylist_id = b.stylist_id
     LEFT JOIN reviews r ON b.booking_id = r.booking_id
     LEFT JOIN transactions t ON b.booking_id = t.booking_id AND t.payment_status = 'paid'
     GROUP BY s.stylist_id
     ORDER BY total_revenue DESC`
  );
  
  res.json({
    success: true,
    data,
  });
});

/**
 * Get booking status breakdown
 * GET /api/dashboard/booking-status
 */
exports.getBookingStatusBreakdown = asyncHandler(async (req, res) => {
  const [data] = await db.query(
    `SELECT status, COUNT(*) as count
     FROM bookings
     GROUP BY status`
  );
  
  res.json({
    success: true,
    data,
  });
});

/**
 * Get customer growth
 * GET /api/dashboard/customer-growth
 */
exports.getCustomerGrowth = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  
  let query;
  if (period === 'month') {
    query = `
      SELECT DATE_FORMAT(created_at, '%Y-%m') as period, COUNT(*) as count
      FROM customers
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY period ASC
    `;
  } else {
    query = `
      SELECT DATE(created_at) as period, COUNT(*) as count
      FROM customers
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY period ASC
    `;
  }
  
  const [data] = await db.query(query);
  
  res.json({
    success: true,
    data,
  });
});

module.exports = exports;

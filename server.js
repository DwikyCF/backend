/**
 * Main Server File
 * Express server setup dengan middleware dan routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Trust proxy - important for rate limiting behind proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration - Allow frontend access
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://frontend-delta-taupe.vercel.app', // Add your Vercel domain
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log('⚠️  CORS blocked origin:', origin);
      callback(null, true); // In production, you might want to block: callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API root info (helpful when visiting /api directly)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Salon Management API root',
    availableRoutes: ['/api/auth', '/api/services', '/api/bookings', '/api/dashboard', '/api/profile'],
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Salon Management API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;
let server;
let isShuttingDown = false;

// Database connection with retry
async function connectDatabase(retries = 5, delay = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const connection = await db.getConnection();
      console.log(`✅ Database connection established (attempt ${i}/${retries})`);
      connection.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i}/${retries} failed:`, err.message);
      if (i < retries) {
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ All database connection attempts failed');
  return false;
}

// Start server function
async function startServer() {
  try {
    // Wait for database connection
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('⚠️  Starting server without database connection');
    }

    // Start HTTP server
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(50));
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 Listening on port ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/health`);
      console.log('='.repeat(50));
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Promise Rejection:', err);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      try {
        await db.end();
        console.log('✅ Database connections closed');
        console.log('👋 Server shut down successfully');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing database connections:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Start the server
startServer();

module.exports = app;

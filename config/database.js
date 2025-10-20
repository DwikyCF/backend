/**
 * Database Configuration
 * Koneksi ke MySQL database menggunakan mysql2 dengan promise support
 * Support untuk Railway DATABASE_URL dan individual env vars
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Parse DATABASE_URL dari Railway atau gunakan individual env vars
 * Railway menyediakan DATABASE_URL dalam format:
 * mysql://user:password@host:port/database
 */
function getDatabaseConfig() {
  // Prioritaskan DATABASE_URL dari Railway
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 60000, // 60 seconds
        // SSL configuration untuk Railway MySQL
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : undefined
      };
    } catch (error) {
      console.error('❌ Error parsing DATABASE_URL:', error.message);
      console.error('Falling back to individual environment variables');
    }
  }

  // Fallback ke individual environment variables (untuk development)
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salon_management',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 60000, // 60 seconds
  };
}

// Create connection pool untuk performa lebih baik
const pool = mysql.createPool(getDatabaseConfig());

// Test connection dengan retry mechanism
async function testConnection(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      console.log(`📊 Connection pool config: ${pool.pool.config.connectionLimit} max connections`);
      connection.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, err.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ All database connection attempts failed');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
    }
  }
  return false;
}

// Jalankan test connection saat module di-load
testConnection();

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Connection lost, pool will reconnect automatically');
  }
});

module.exports = pool;

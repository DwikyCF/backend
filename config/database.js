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
  const mysql = require('mysql2');

// Parse DATABASE_URL atau gunakan individual env vars
function getDatabaseConfig() {
  // Railway MySQL Plugin provides these variables:
  // - MYSQL_URL (full connection string)
  // - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
  
  // Priority 1: MYSQL_URL (Railway's standard)
  if (process.env.MYSQL_URL) {
    try {
      const url = new URL(process.env.MYSQL_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      };
    } catch (err) {
      console.error('Failed to parse MYSQL_URL:', err.message);
    }
  }

  // Priority 2: DATABASE_URL (generic fallback)
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      };
    } catch (err) {
      console.error('Failed to parse DATABASE_URL:', err.message);
    }
  }

  // Priority 3: Railway's individual MySQL variables
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT) || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  }

  // Priority 4: Standard env vars (for local development)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salon_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

const config = getDatabaseConfig();

// Log configuration (hide password)
console.log('Database Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  User: ${config.user}`);
console.log(`  Database: ${config.database}`);

// Buat connection pool
const pool = mysql.createPool(config);

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was lost. Reconnecting...');
  }
});

module.exports = pool;
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


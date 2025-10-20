/**
 * Database Configuration
 * Koneksi ke MySQL database menggunakan mysql2/promise
 * Support untuk Railway MYSQL_URL dan individual env vars
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Parse DATABASE_URL dari Railway atau gunakan individual env vars
 */
function getDatabaseConfig() {
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

  // Priority 2: Railway's individual MySQL variables
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT) || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  }

  // Priority 3: DATABASE_URL (generic fallback)
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

// Export promise pool
module.exports = pool;

/**
 * Database Initialization Script
 * Script ini akan menjalankan schema.sql saat deployment pertama kali
 * Digunakan untuk setup database di Railway
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL dari Railway atau gunakan individual env vars
function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    // Parse Railway's DATABASE_URL format
    // Format: mysql://user:password@host:port/database
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      multipleStatements: true, // Important untuk menjalankan multiple SQL statements
    };
  }

  // Fallback ke individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salon_management',
    multipleStatements: true,
  };
}

async function initializeDatabase() {
  let connection;

  try {
    console.log('🔄 Starting database initialization...');
    
    const config = getDatabaseConfig();
    console.log(`📡 Connecting to database: ${config.host}:${config.port}/${config.database}`);

    // Buat koneksi tanpa database terlebih dahulu
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    // Cek apakah database sudah ada
    const [databases] = await tempConnection.query(
      `SHOW DATABASES LIKE '${config.database}'`
    );

    if (databases.length === 0) {
      console.log(`📦 Creating database: ${config.database}`);
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    } else {
      console.log(`✅ Database ${config.database} already exists`);
    }

    await tempConnection.end();

    // Koneksi ke database yang sudah dibuat
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Cek apakah tabel sudah ada
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log(`ℹ️  Database already initialized with ${tables.length} tables`);
      console.log('⏭️  Skipping schema import (tables already exist)');
      
      // Tampilkan list tabel yang ada
      console.log('📋 Existing tables:');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
      
      await connection.end();
      return;
    }

    // Baca dan jalankan schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log(`📄 Reading schema file: ${schemaPath}`);
    
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split SQL berdasarkan delimiter untuk stored procedures
    console.log('🔄 Executing schema...');
    
    // Remove comments dan split statements
    const statements = schema
      .split(/\r?\n/)
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim() !== '');

    let executedCount = 0;
    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      if (trimmedStmt) {
        try {
          await connection.query(trimmedStmt);
          executedCount++;
        } catch (err) {
          // Ignore errors untuk statements yang sudah ada atau tidak critical
          if (!err.message.includes('already exists')) {
            console.warn(`⚠️  Warning executing statement: ${err.message}`);
          }
        }
      }
    }

    console.log(`✅ Schema executed successfully (${executedCount} statements)`);

    // Verifikasi tabel yang dibuat
    const [newTables] = await connection.query('SHOW TABLES');
    console.log(`✅ Database initialized with ${newTables.length} tables`);
    
    console.log('📋 Created tables:');
    newTables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    await connection.end();
    console.log('✅ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Error details:', error);
    
    if (connection) {
      await connection.end();
    }
    
    process.exit(1);
  }
}

// Jalankan initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Fatal error:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;

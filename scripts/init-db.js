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
  // Log environment variables untuk debugging (tanpa password)
  console.log('🔍 Checking environment variables...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('MYSQL_URL exists:', !!process.env.MYSQL_URL);
  console.log('MYSQLHOST exists:', !!process.env.MYSQLHOST);
  console.log('MYSQL_DATABASE exists:', !!process.env.MYSQL_DATABASE);

  // Railway bisa menggunakan MYSQL_URL atau DATABASE_URL
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (dbUrl) {
    try {
      // Parse Railway's DATABASE_URL format
      // Format: mysql://user:password@host:port/database
      const url = new URL(dbUrl);
      
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        multipleStatements: true,
        connectTimeout: 60000, // 60 seconds timeout
      };

      console.log('✅ Using DATABASE_URL configuration');
      console.log(`   Host: ${config.host}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   User: ${config.user}`);
      console.log(`   Database: ${config.database}`);

      return config;
    } catch (err) {
      console.error('❌ Error parsing DATABASE_URL:', err.message);
      console.log('⚠️  Falling back to individual environment variables');
    }
  }

  // Fallback ke individual environment variables (Railway format)
  const config = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'railway',
    multipleStatements: true,
    connectTimeout: 60000,
  };

  console.log('✅ Using individual environment variables');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);

  return config;
}

async function initializeDatabase() {
  let connection;
  let tempConnection;

  try {
    console.log('🔄 Starting database initialization...');
    
    const config = getDatabaseConfig();
    console.log(`📡 Attempting to connect to: ${config.host}:${config.port}/${config.database}`);

    // Test connection tanpa database terlebih dahulu
    console.log('🔌 Testing database connection...');
    
    tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      connectTimeout: 60000,
    });

    console.log('✅ Successfully connected to MySQL server');

    // Cek apakah database sudah ada
    const [databases] = await tempConnection.query(
      `SHOW DATABASES LIKE '${config.database}'`
    );

    if (databases.length === 0) {
      console.log(`📦 Creating database: ${config.database}`);
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
      console.log(`✅ Database ${config.database} created`);
    } else {
      console.log(`✅ Database ${config.database} already exists`);
    }

    await tempConnection.end();
    console.log('🔌 Reconnecting to specific database...');

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
      console.log('✅ Database initialization completed (already initialized)');
      return;
    }

    // Baca dan jalankan schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log(`📄 Reading schema file: ${schemaPath}`);
    
    let schema;
    try {
      schema = await fs.readFile(schemaPath, 'utf8');
      console.log(`✅ Schema file loaded (${schema.length} characters)`);
    } catch (err) {
      console.error('❌ Error reading schema file:', err.message);
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    // Split SQL berdasarkan delimiter untuk stored procedures
    console.log('🔄 Executing schema...');
    
    // Remove comments dan split statements
    const statements = schema
      .split(/\r?\n/)
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim() !== '');

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    let executedCount = 0;
    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      if (trimmedStmt) {
        try {
          await connection.query(trimmedStmt);
          executedCount++;
          if (executedCount % 5 === 0) {
            console.log(`   Executed ${executedCount}/${statements.length} statements...`);
          }
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
    console.error('❌ Database initialization failed');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 Connection Refused Error:');
      console.error('   - MySQL service might not be running');
      console.error('   - Check if MYSQLHOST and MYSQLPORT are correct');
      console.error('   - Verify MySQL service is deployed in Railway');
      console.error('   - Make sure both services are in the same project');
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔴 Access Denied Error:');
      console.error('   - Check MYSQLUSER and MYSQLPASSWORD are correct');
    }

    console.error('\nFull error details:', error);
    
    if (tempConnection) {
      try {
        await tempConnection.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore cleanup errors
      }
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

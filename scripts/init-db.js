/**
 * Database Initialization Script for Railway
 * Script ini akan menjalankan schema.sql saat deployment pertama kali
 * Compatible dengan Railway's MySQL Plugin
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL dari Railway atau gunakan individual env vars
function getDatabaseConfig() {
  // Railway MySQL Plugin provides these variables:
  // - MYSQL_URL (full connection string)
  // - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQL_DATABASE
  
  console.log('🔍 Checking environment variables...');
  
  // Priority 1: MYSQL_URL (Railway's standard)
  if (process.env.MYSQL_URL) {
    console.log('✅ Using MYSQL_URL');
    try {
      const url = new URL(process.env.MYSQL_URL);
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        multipleStatements: true,
        connectTimeout: 60000, // 60 seconds
        waitForConnections: true,
      };
      
      console.log(`   Host: ${config.host}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   User: ${config.user}`);
      console.log(`   Database: ${config.database}`);
      
      return config;
    } catch (err) {
      console.error('❌ Failed to parse MYSQL_URL:', err.message);
    }
  }

  // Priority 2: Railway's individual MySQL variables
  if (process.env.MYSQLHOST) {
    console.log('✅ Using individual MYSQL* variables');
    const config = {
      host: process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQLPORT) || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
      connectTimeout: 60000,
      waitForConnections: true,
    };
    
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Database: ${config.database}`);
    
    return config;
  }

  // Priority 3: DATABASE_URL (generic fallback)
  if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL');
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        multipleStatements: true,
        connectTimeout: 60000,
        waitForConnections: true,
      };
    } catch (err) {
      console.error('❌ Failed to parse DATABASE_URL:', err.message);
    }
  }

  // Priority 4: Standard individual env vars (for local development)
  console.log('⚠️  Using local development config');
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salon_management',
    multipleStatements: true,
    connectTimeout: 60000,
    waitForConnections: true,
  };
}

async function waitForDatabase(config, maxRetries = 10, retryDelay = 5000) {
  console.log('⏳ Waiting for database to be ready...');
  
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`   Attempt ${i}/${maxRetries}...`);
      
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        connectTimeout: 10000,
      });
      
      await connection.ping();
      await connection.end();
      
      console.log('✅ Database is ready!');
      return true;
    } catch (err) {
      console.log(`   ⏳ Database not ready yet: ${err.message}`);
      
      if (i === maxRetries) {
        throw new Error(`Database not available after ${maxRetries} attempts: ${err.message}`);
      }
      
      console.log(`   Waiting ${retryDelay/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function initializeDatabase() {
  let connection;

  try {
    console.log('🚀 Starting database initialization...');
    console.log('📅 ' + new Date().toISOString());
    console.log('');
    
    const config = getDatabaseConfig();
    
    // Validate configuration
    if (!config.host || !config.user || !config.database) {
      throw new Error('❌ Missing required database configuration. Please check your environment variables.');
    }

    console.log('');
    console.log('📡 Database Configuration:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Password: ${config.password ? '[SET]' : '[NOT SET]'}`);
    console.log('');

    // Wait for database to be available
    await waitForDatabase(config);
    console.log('');

    console.log('🔌 Connecting to MySQL server...');

    // Buat koneksi tanpa database terlebih dahulu
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      connectTimeout: 30000,
    });

    console.log('✅ Connected to MySQL server');

    // Cek apakah database sudah ada
    const [databases] = await tempConnection.query(
      `SHOW DATABASES LIKE '${config.database}'`
    );

    if (databases.length === 0) {
      console.log(`📦 Creating database: ${config.database}`);
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`✅ Database '${config.database}' already exists`);
    }

    await tempConnection.end();

    // Koneksi ke database yang sudah dibuat
    console.log(`🔌 Connecting to database: ${config.database}`);
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');
    console.log('');

    // Cek apakah tabel sudah ada
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log(`ℹ️  Database already initialized with ${tables.length} tables`);
      console.log('⏭️  Skipping schema import (tables already exist)');
      console.log('');
      
      // Tampilkan list tabel yang ada
      console.log('📋 Existing tables:');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
      console.log('');
      
      await connection.end();
      console.log('✅ Database initialization completed (already initialized)');
      console.log('');
      return; // EXIT EARLY - PENTING!
    }

    // Baca dan jalankan schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log(`📄 Reading schema file: ${schemaPath}`);
    
    const schemaExists = await fs.access(schemaPath).then(() => true).catch(() => false);
    if (!schemaExists) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schema = await fs.readFile(schemaPath, 'utf8');
    console.log(`📄 Schema file loaded (${schema.length} bytes)`);
    console.log('');
    
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
    console.log('');

    let executedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.query(statement);
          executedCount++;
          
          // Log progress setiap 10 statements
          if ((i + 1) % 10 === 0) {
            console.log(`   ⏳ Progress: ${i + 1}/${statements.length} statements executed...`);
          }
        } catch (err) {
          errorCount++;
          // Ignore errors untuk statements yang sudah ada atau tidak critical
          if (!err.message.includes('already exists')) {
            console.warn(`   ⚠️  Warning at statement ${i + 1}: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('');
    console.log(`✅ Schema executed: ${executedCount} successful, ${errorCount} warnings`);
    console.log('');

    // Verifikasi tabel yang dibuat
    const [newTables] = await connection.query('SHOW TABLES');
    console.log(`✅ Database initialized with ${newTables.length} tables`);
    console.log('');
    
    if (newTables.length > 0) {
      console.log('📋 Created tables:');
      newTables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
      console.log('');
    } else {
      console.warn('⚠️  Warning: No tables were created. Please check the schema.sql file.');
      console.log('');
    }

    await connection.end();
    console.log('✅ Database initialization completed successfully!');
    console.log('🎉 All done!');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Database initialization failed!');
    console.error('Error message:', error.message);
    console.error('');
    
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        // Ignore connection close errors
      }
    }
    
    // Jangan exit dengan error jika tables sudah ada
    if (error.message && error.message.includes('already')) {
      console.log('ℹ️  Database already initialized, continuing...');
      console.log('');
      process.exit(0);
    }
    
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if MySQL service is running in Railway');
    console.error('2. Verify environment variables are set correctly');
    console.error('3. Ensure MySQL service is linked to this service');
    console.error('4. Check Railway logs for MySQL connection details');
    console.error('5. Verify the schema.sql file exists in database/ folder');
    console.error('');
    
    process.exit(1);
  }
}

// Jalankan initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Fatal error:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;

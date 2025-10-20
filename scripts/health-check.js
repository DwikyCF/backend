/**
 * Health Check and Database Verification Script
 * Test koneksi database dan verifikasi setup sebelum deploy
 */

require('dotenv').config();
const pool = require('../config/database');

async function healthCheck() {
  console.log('\n🏥 Starting Health Check...\n');
  console.log('='.repeat(60));

  const checks = {
    database: false,
    tables: false,
    environment: false,
  };

  try {
    // 1. Check Environment Variables
    console.log('\n📋 Checking Environment Variables...');
    const requiredEnvVars = [
      'DB_HOST',
      'DB_USER', 
      'DB_NAME',
      'JWT_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
    ];

    const missingVars = [];
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName] || process.env.DATABASE_URL;
      if (!value) {
        missingVars.push(varName);
        console.log(`   ❌ ${varName}: NOT SET`);
      } else {
        console.log(`   ✅ ${varName}: SET`);
      }
    });

    if (missingVars.length === 0 || process.env.DATABASE_URL) {
      checks.environment = true;
      console.log('   ✅ All required environment variables are set');
    } else {
      console.log(`   ⚠️  Missing variables: ${missingVars.join(', ')}`);
    }

    // 2. Check Database Connection
    console.log('\n🔌 Checking Database Connection...');
    const connection = await pool.getConnection();
    console.log('   ✅ Database connection successful');
    
    // Get database info
    const [dbInfo] = await connection.query('SELECT DATABASE() as db, VERSION() as version');
    console.log(`   📊 Database: ${dbInfo[0].db}`);
    console.log(`   📦 MySQL Version: ${dbInfo[0].version}`);
    
    checks.database = true;

    // 3. Check Tables
    console.log('\n📊 Checking Database Tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('   ⚠️  No tables found - run npm run db:init');
      checks.tables = false;
    } else {
      console.log(`   ✅ Found ${tables.length} tables:`);
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`      ${index + 1}. ${tableName}`);
      });
      checks.tables = true;
    }

    // 4. Check Important Tables
    const importantTables = ['users', 'customers', 'bookings', 'services'];
    console.log('\n🔍 Verifying Important Tables...');
    
    for (const tableName of importantTables) {
      const [tableCheck] = await connection.query(
        `SHOW TABLES LIKE '${tableName}'`
      );
      
      if (tableCheck.length > 0) {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ✅ ${tableName}: exists (${count[0].count} rows)`);
      } else {
        console.log(`   ❌ ${tableName}: missing`);
      }
    }

    connection.release();

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 HEALTH CHECK SUMMARY\n');
    console.log(`   Environment Variables: ${checks.environment ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Database Connection:   ${checks.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Database Tables:       ${checks.tables ? '✅ PASS' : '⚠️  WARN'}`);

    const allPassed = checks.environment && checks.database;
    
    if (allPassed) {
      console.log('\n🎉 Health check passed! Your backend is ready.\n');
      
      if (!checks.tables) {
        console.log('⚠️  Note: No tables found. Run: npm run db:init\n');
      }
    } else {
      console.log('\n❌ Health check failed. Please fix the issues above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Health Check Failed:', error.message);
    console.error('\nError Details:', error);
    process.exit(1);
  }
}

// Run health check
if (require.main === module) {
  healthCheck()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = healthCheck;

/**
 * JWT Configuration
 * Setup untuk JSON Web Token authentication
 */

require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key_here',
  expiresIn: process.env.JWT_EXPIRE || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
};

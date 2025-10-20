/**
 * Email Configuration
 * Setup untuk nodemailer email service
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️  Email service not configured:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

module.exports = transporter;

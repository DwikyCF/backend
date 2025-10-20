/**
 * Email Service
 * Service untuk mengirim berbagai jenis email
 */

const transporter = require('../config/email');

/**
 * Send Email
 * Generic function untuk send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Salon Management <noreply@salon.com>',
      to,
      subject,
      text,
      html,
    });
    
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Booking Confirmation Email
 */
const sendBookingConfirmation = async (customerEmail, bookingData) => {
  const subject = '✅ Booking Confirmation - Salon Management';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e91e63;">Booking Confirmed!</h2>
      <p>Hi ${bookingData.customerName},</p>
      <p>Your booking has been confirmed. Here are the details:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Booking Code:</strong> ${bookingData.bookingCode}</p>
        <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
        <p><strong>Time:</strong> ${bookingData.bookingTime}</p>
        <p><strong>Services:</strong> ${bookingData.services}</p>
        <p><strong>Stylist:</strong> ${bookingData.stylistName || 'Auto-assigned'}</p>
        <p><strong>Total:</strong> ${bookingData.totalPrice}</p>
      </div>
      
      <p>We look forward to seeing you!</p>
      <p style="color: #666; font-size: 12px;">If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
    </div>
  `;
  
  return sendEmail({ to: customerEmail, subject, html });
};

/**
 * Send Booking Reminder Email
 */
const sendBookingReminder = async (customerEmail, bookingData) => {
  const subject = '🔔 Booking Reminder - Tomorrow';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e91e63;">Reminder: Your Appointment is Tomorrow!</h2>
      <p>Hi ${bookingData.customerName},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      
      <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
        <p><strong>Time:</strong> ${bookingData.bookingTime}</p>
        <p><strong>Services:</strong> ${bookingData.services}</p>
      </div>
      
      <p>See you soon! 💇‍♀️</p>
    </div>
  `;
  
  return sendEmail({ to: customerEmail, subject, html });
};

/**
 * Send Booking Cancellation Email
 */
const sendBookingCancellation = async (customerEmail, bookingData) => {
  const subject = '❌ Booking Cancelled';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f44336;">Booking Cancelled</h2>
      <p>Hi ${bookingData.customerName},</p>
      <p>Your booking has been cancelled:</p>
      
      <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Booking Code:</strong> ${bookingData.bookingCode}</p>
        <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
        <p><strong>Time:</strong> ${bookingData.bookingTime}</p>
      </div>
      
      <p>We hope to see you again soon!</p>
    </div>
  `;
  
  return sendEmail({ to: customerEmail, subject, html });
};

/**
 * Send Payment Confirmation Email
 */
const sendPaymentConfirmation = async (customerEmail, transactionData) => {
  const subject = '💳 Payment Confirmed';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4caf50;">Payment Confirmed!</h2>
      <p>Hi ${transactionData.customerName},</p>
      <p>Thank you for your payment. Here's your receipt:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${transactionData.invoiceNumber}</p>
        <p><strong>Amount Paid:</strong> ${transactionData.amount}</p>
        <p><strong>Payment Method:</strong> ${transactionData.paymentMethod}</p>
        <p><strong>Date:</strong> ${transactionData.paymentDate}</p>
        ${transactionData.loyaltyPoints ? `<p><strong>Loyalty Points Earned:</strong> ${transactionData.loyaltyPoints} points</p>` : ''}
      </div>
      
      <p>Thank you for choosing our salon!</p>
    </div>
  `;
  
  return sendEmail({ to: customerEmail, subject, html });
};

/**
 * Send Welcome Email
 */
const sendWelcomeEmail = async (customerEmail, customerName) => {
  const subject = '👋 Welcome to Our Salon!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e91e63;">Welcome, ${customerName}! 🎉</h2>
      <p>Thank you for registering with us!</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Get Started:</h3>
        <ul>
          <li>Browse our services</li>
          <li>Book your first appointment</li>
          <li>Earn loyalty points with every visit</li>
          <li>Enjoy exclusive member discounts</li>
        </ul>
      </div>
      
      <p>We can't wait to serve you!</p>
      <p style="color: #666; font-size: 12px;">Questions? Feel free to contact us anytime.</p>
    </div>
  `;
  
  return sendEmail({ to: customerEmail, subject, html });
};

/**
 * Send Password Reset Email
 */
const sendPasswordReset = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = '🔐 Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e91e63;">Password Reset Request</h2>
      <p>You requested to reset your password.</p>
      <p>Click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color: #f44336; font-size: 14px;">This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  
  return sendEmail({ to: userEmail, subject, html });
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancellation,
  sendPaymentConfirmation,
  sendWelcomeEmail,
  sendPasswordReset,
};

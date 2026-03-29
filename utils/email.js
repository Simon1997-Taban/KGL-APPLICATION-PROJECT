/**
 * Email Service
 * Handles sending OTP codes and verification emails via Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Configure transporter for Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use TLS (true for 465, false for other ports)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send OTP verification email
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - User's name
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>} - True if email sent successfully
 */
async function sendOTPEmail(userEmail, userName, otpCode) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email config incomplete; OTP email not sent. Set SMTP_USER and SMTP_PASSWORD in .env');
      return false;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'KGL'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: userEmail,
      subject: 'Verify Your KGL Account - OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 10px;">
          <div style="background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome to KGL!</h2>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Hi ${userName},
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Thank you for registering with KGL Agricultural Management System. To complete your registration and verify your email, please use the following One-Time Password (OTP):
            </p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #27ae60;">
              <p style="font-size: 14px; color: #7f8c8d; margin: 0 0 10px 0;">Your OTP Code</p>
              <p style="font-size: 36px; font-weight: bold; color: #27ae60; margin: 0; letter-spacing: 3px;">${otpCode}</p>
            </div>
            
            <p style="font-size: 14px; color: #e74c3c; margin: 20px 0;">
              <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              If you did not request this verification code, please ignore this email or contact our support team immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #95a5a6; text-align: center;">
              KGL Agricultural Management System | Secure Email Verification
            </p>
          </div>
        </div>
      `,
      text: `Your OTP code is: ${otpCode}\nThis code will expire in 10 minutes.\nDo not share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.response);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error.message);
    return false;
  }
}

/**
 * Send verification success email
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - User's name
 * @returns {Promise<boolean>} - True if email sent successfully
 */
async function sendVerificationSuccessEmail(userEmail, userName) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return false;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'KGL'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: userEmail,
      subject: 'Email Verified - Welcome to KGL!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 10px;">
          <div style="background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #27ae60; margin-bottom: 20px;">✓ Email Verified Successfully!</h2>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Hi ${userName},
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Your account has been successfully verified! You can now log in to the KGL Agricultural Management System using your credentials.
            </p>
            
            <div style="background-color: #d5f4e6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
              <p style="color: #27ae60; margin: 0;">
                <strong>✓ Account Status:</strong> Active and Ready to Use
              </p>
            </div>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              You can now:
            </p>
            <ul style="font-size: 16px; color: #555; line-height: 1.8;">
              <li>Log in to your account</li>
              <li>Access all features and dashboards</li>
              <li>Manage your profile and settings</li>
            </ul>
            
            <p style="font-size: 14px; color: #95a5a6; margin-top: 30px;">
              If you have any questions, contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `Your email has been verified successfully! You can now log in to your KGL account.`
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification success email:', error.message);
    return false;
  }
}

module.exports = {
  sendOTPEmail,
  sendVerificationSuccessEmail
};

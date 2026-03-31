/**
 * Email Service
 * Handles sending OTP codes and verification emails via Resend
 */

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP verification email
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - User's name
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>} - True if email sent successfully
 */
async function sendOTPEmail(userEmail, userName, otpCode) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not set');
      return false;
    }
    const { error } = await resend.emails.send({
      from: 'KGL <onboarding@resend.dev>',
      to: userEmail,
      subject: 'Verify Your KGL Account - OTP Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;border-radius:10px">
          <div style="background:#fff;padding:30px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1)">
            <h2 style="color:#2c3e50">Welcome to KGL!</h2>
            <p style="color:#555">Hi ${userName},</p>
            <p style="color:#555">Use the OTP below to verify your account. It expires in 10 minutes.</p>
            <div style="background:#ecf0f1;padding:20px;border-radius:8px;text-align:center;margin:30px 0;border-left:4px solid #27ae60">
              <p style="font-size:14px;color:#7f8c8d;margin:0 0 10px">Your OTP Code</p>
              <p style="font-size:36px;font-weight:bold;color:#27ae60;margin:0;letter-spacing:3px">${otpCode}</p>
            </div>
            <p style="color:#e74c3c;font-size:14px"><strong>⚠️ Do not share this code with anyone.</strong></p>
            <hr style="border:none;border-top:1px solid #ecf0f1;margin:30px 0">
            <p style="font-size:12px;color:#95a5a6;text-align:center">KGL Agricultural Management System</p>
          </div>
        </div>`
    });
    if (error) { console.error('❌ Resend error:', error); return false; }
    console.log('✅ OTP email sent to', userEmail);
    return true;
  } catch (err) {
    console.error('❌ sendOTPEmail failed:', err.message);
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
    if (!process.env.RESEND_API_KEY) return false;
    const { error } = await resend.emails.send({
      from: 'KGL <onboarding@resend.dev>',
      to: userEmail,
      subject: 'Email Verified - Welcome to KGL!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;border-radius:10px">
          <div style="background:#fff;padding:30px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1)">
            <h2 style="color:#27ae60">✓ Email Verified Successfully!</h2>
            <p style="color:#555">Hi ${userName},</p>
            <p style="color:#555">Your KGL account is now active. You can log in and access all features.</p>
            <div style="background:#d5f4e6;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #27ae60">
              <strong style="color:#27ae60">✓ Account Status: Active</strong>
            </div>
          </div>
        </div>`
    });
    if (error) { console.error('❌ Resend error:', error); return false; }
    return true;
  } catch (err) {
    console.error('Error sending verification success email:', err.message);
    return false;
  }
}

module.exports = {
  sendOTPEmail,
  sendVerificationSuccessEmail
};

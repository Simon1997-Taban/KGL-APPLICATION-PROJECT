/**
 * Authentication Routes
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Handles user registration, login, and profile management.
 * Uses JWT tokens for stateless authentication.
 * Passwords are hashed using bcryptjs before storage.
 * Validates all input including email, phone numbers, and password strength.
 * 
 * Endpoints:
 * - POST /api/auth/register - Create new user account
 * - POST /api/auth/login - Authenticate user and receive JWT token
 * - GET /api/auth/profile/:userId - Retrieve user profile information
 * 
 * User Roles Supported:
 * - director: Full system access and reporting
 * - manager: Procurement and branch management
 * - procurement: Can record procurement operations
 * - agent: Can record sales transactions
 * 
 * Required for Registration:
 * - name, email, password, role, branch, contact
 * 
 * Optional:
 * - photo: User profile picture (file upload)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { sendOTPEmail, sendVerificationSuccessEmail } = require('../utils/email');

// Use the same default secret as middleware/auth.js to avoid token verification mismatches
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

// Attempt to load multer for handling file uploads. If it's not installed,
// fall back to not saving files and continue handling JSON registrations.
let multer;
let uploadMiddleware = null;
try {
  multer = require('multer');
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
      cb(null, uniqueSuffix + '-' + sanitized);
    }
  });
  const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
  uploadMiddleware = upload.single('photo');
} catch (e) {
  console.warn('Optional dependency "multer" not found; file upload disabled. Install with: npm install multer');
}

// Register endpoint
if (uploadMiddleware) {
  router.post('/register', uploadMiddleware, async (req, res) => {
    try {
      console.log('Register request received (with possible file):', { email: req.body.email, role: req.body.role });

      let { name, email, password, confirmPassword, role, branch, contact, phone } = req.body;
      contact = contact || phone;

      // Validate required fields
      if (!name || !email || !password || !confirmPassword || !role || !branch || !contact) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
      }

      email = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Validate role
      const validRoles = ['director', 'manager', 'procurement', 'agent'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }

      // Validate branch
      if (!['branch1', 'branch2'].includes(branch)) {
        return res.status(400).json({ error: 'Branch must be branch1 or branch2' });
      }

      // Validate contact
      contact = String(contact).trim();
      if (!PHONE_REGEX.test(contact)) {
        return res.status(400).json({ error: 'Contact must be a valid phone number (10-15 digits)' });
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        console.log('Passwords do not match');
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists && userExists.isVerified) {
        console.log('Verified user already exists:', email);
        return res.status(400).json({ error: 'Email already registered. Please log in.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // If unverified user exists, update their account
      if (userExists && !userExists.isVerified) {
        console.log('Unverified user found, updating registration:', email);
        userExists.name = name;
        userExists.password = hashedPassword;
        userExists.role = role;
        userExists.branch = branch;
        userExists.contact = contact;
        userExists.verificationCode = verificationCode;
        
        if (req.file) {
          userExists.photo = '/uploads/' + req.file.filename;
        }
        
        await userExists.save();
        console.log('Unverified user re-registered:', email);
        
        // Send new OTP email
        console.log(`Attempting to send new OTP code ${verificationCode} to ${email}`);
        sendOTPEmail(userExists.email, userExists.name, verificationCode).catch(err => 
          console.error('Failed to send OTP email:', err.message)
        );
        
        return res.status(201).json({
          message: 'Registration updated. A new verification code has been sent to your email.',
          userId: userExists._id,
          email: userExists.email,
          requiresVerification: true
        });
      }

      // Build user object
      const userData = {
        name,
        email,
        password: hashedPassword,
        role,
        branch,
        contact,
        isVerified: false,
        verificationCode
      };

      if (req.file) {
        // Save public-accessible path
        userData.photo = '/uploads/' + req.file.filename;
      }

      // Create new user
      const user = new User(userData);
      await user.save();
      console.log('User registered successfully:', email);

      // Send OTP email asynchronously (don't block response)
      console.log(`Attempting to send OTP code ${verificationCode} to ${email}`);
      sendOTPEmail(user.email, user.name, verificationCode).catch(err => 
        console.error('Failed to send OTP email:', err.message)
      );

      // ⚠️ DO NOT ISSUE TOKEN HERE - User must verify email first
      res.status(201).json({
        message: 'User registered successfully. A verification code has been sent to your email.',
        userId: user._id,
        email: user.email,
        requiresVerification: true
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: error.message });
    }
  });
} else {
  router.post('/register', async (req, res) => {
    try {
      console.log('Register request received:', { email: req.body.email, role: req.body.role });
      
      let { name, email, password, confirmPassword, role, branch, contact, phone } = req.body;
      contact = contact || phone;

      // Validate required fields
      if (!name || !email || !password || !confirmPassword || !role || !branch || !contact) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
      }

      email = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Validate role
      const validRoles = ['director', 'manager', 'procurement', 'agent'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }

      // Validate branch
      if (!['branch1', 'branch2'].includes(branch)) {
        return res.status(400).json({ error: 'Branch must be branch1 or branch2' });
      }

      // Validate contact
      contact = String(contact).trim();
      if (!PHONE_REGEX.test(contact)) {
        return res.status(400).json({ error: 'Contact must be a valid phone number (10-15 digits)' });
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        console.log('Passwords do not match');
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists && userExists.isVerified) {
        console.log('Verified user already exists:', email);
        return res.status(400).json({ error: 'Email already registered. Please log in.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // If unverified user exists, update their account
      if (userExists && !userExists.isVerified) {
        console.log('Unverified user found, updating registration:', email);
        userExists.name = name;
        userExists.password = hashedPassword;
        userExists.role = role;
        userExists.branch = branch;
        userExists.contact = contact;
        userExists.verificationCode = verificationCode;
        
        await userExists.save();
        console.log('Unverified user re-registered:', email);
        
        // Send new OTP email
        console.log(`Attempting to send new OTP code ${verificationCode} to ${email}`);
        sendOTPEmail(userExists.email, userExists.name, verificationCode).catch(err => 
          console.error('Failed to send OTP email:', err.message)
        );
        
        return res.status(201).json({
          message: 'Registration updated. A new verification code has been sent to your email.',
          userId: userExists._id,
          email: userExists.email,
          requiresVerification: true
        });
      }

      // Create new user (no photo)
      const user = new User({ 
        name,
        email,
        password: hashedPassword,
        role,
        branch,
        contact,
        isVerified: false,
        verificationCode
      });
      
      await user.save();
      console.log('User registered successfully:', email);

      // Send OTP email asynchronously (don't block response)
      console.log(`Attempting to send OTP code ${verificationCode} to ${email}`);
      sendOTPEmail(user.email, user.name, verificationCode).catch(err => 
        console.error('Failed to send OTP email:', err.message)
      );

      // ⚠️ DO NOT ISSUE TOKEN HERE - User must verify email first
      res.status(201).json({ 
        message: 'User registered successfully. A verification code has been sent to your email.',
        userId: user._id,
        email: user.email,
        requiresVerification: true
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify account is verified
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your account before login.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      role: user.role,
      userId: user._id,
      name: user.name,
      photo: user.photo,
      branch: user.branch,
      contact: user.contact
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify user account with code from email/sms
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: 'Account already verified' });
    }

    if (user.verificationCode !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    // Send verification success email
    await sendVerificationSuccessEmail(user.email, user.name);

    return res.json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send/Resend OTP to email
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: 'Account is already verified' });
    }

    // Generate new OTP code
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newOTP;
    await user.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(user.email, user.name, newOTP);

    if (emailSent) {
      return res.json({ 
        message: 'OTP sent successfully to your email',
        email: user.email,
        verificationCode: newOTP // For testing only; remove before production
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to send OTP email. Please check email configuration.' 
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile endpoint
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      contact: user.contact,
      photo: user.photo
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/profile/:userId
 * Allows a user to update their own profile.
 * Directors can update any profile.
 */
const updateProfileHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only the owner or a director can edit
    if (req.user.userId !== userId && req.user.role !== 'director') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const { name, contact, branch, password } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (contact) {
      if (!/^[0-9]{10,15}$/.test(contact)) {
        return res.status(400).json({ error: 'Contact must be a valid phone number (10-15 digits)' });
      }
      updates.contact = contact;
    }
    if (branch) {
      if (!['branch1', 'branch2'].includes(branch)) {
        return res.status(400).json({ error: 'Branch must be branch1 or branch2' });
      }
      updates.branch = branch;
    }
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      updates.photo = '/uploads/' + req.file.filename;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated',
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      contact: user.contact,
      photo: user.photo
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Use multer when available, otherwise fall back to JSON-only updates
if (uploadMiddleware) {
  router.put('/profile/:userId', verifyToken, uploadMiddleware, updateProfileHandler);
} else {
  router.put('/profile/:userId', verifyToken, updateProfileHandler);
}

module.exports = router;

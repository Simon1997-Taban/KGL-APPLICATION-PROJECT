/**
 * User Schema & Model
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Description: Defines the User collection schema in MongoDB.
 * Contains user authentication data, role information, and branch assignment.
 * 
 * User Roles:
 * - director: Can view all reports and manage all operations company-wide
 * - manager: Can record procurement, view branch reports, manage sales
 * - procurement: Can record procurement operations
 * - agent: Can record regular and credit sales
 * 
 * Branch Assignment:
 * - branch1: First warehouse/distribution center
 * - branch2: Second warehouse/distribution center
 */

const mongoose = require('mongoose');

/**
 * User Schema Definition
 * 
 * Fields:
 * - name: User's full name (required, min 3 chars)
 * - email: User's email address (required, unique, validated)
 * - password: Hashed password (required, min 6 chars)
 * - role: User's access level (required, enum)
 * - branch: Assigned branch (required, enum)
 * - contact: Phone number for communication (required, validated)
 * - photo: Profile picture URL (optional)
 * - timestamps: Automatic createdAt and updatedAt fields
 */
const userSchema = new mongoose.Schema({
  // User's full name
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [3, 'Name must be at least 3 characters']
  },

  // User's email address - serves as login identifier
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // Prevents duplicate registrations
    lowercase: true, // Normalize email to lowercase
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },

  // User's hashed password - never stored in plain text
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Exclude password by default when querying users
  },

  // User's role determines what operations they can perform
  role: {
    type: String,
    enum: ['director', 'manager', 'procurement', 'agent'],
    required: [true, 'Role is required']
  },

  // Branch assignment - restricts manager operations to their branch
  branch: {
    type: String,
    enum: ['branch1', 'branch2'],
    required: [true, 'Branch assignment is required']
  },

  // Email/phone verification status (can be enhanced with OTP via email/sms)
  isVerified: {
    type: Boolean,
    default: false
  },

  // OTP verification fields (hashed for security)
  otp: {
    type: String,
    default: null
  },

  otpExpires: {
    type: Date,
    default: null
  },

  // Legacy field - can be removed after migration
  verificationCode: {
    type: String,
    default: null
  },

  // Contact phone number for reaching user
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[0-9]{10,15}$/, 'Contact must be a valid phone number (10-15 digits)']
  },

  // Optional profile photo URL
  photo: {
    type: String,
    default: null
  }
}, { 
  // Enable automatic timestamps (createdAt, updatedAt)
  timestamps: true 
});

// Export compiled User model for use in routes
module.exports = mongoose.model('User', userSchema);

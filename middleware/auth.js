/**
 * Authentication & Authorization Middleware
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Handles JWT token verification and role-based access control.
 * This middleware is applied to all protected API endpoints to ensure
 * only authenticated users with appropriate roles can access resources.
 * 
 * Functions:
 * - verifyToken: Validates JWT tokens from Authorization header
 * - authorizeRole: Factory function for role-based restrictions
 * - onlyManagers: Restricts to managers and directors
 * - onlyManagersAndAgents: Restricts to managers, agents, and directors
 * - onlyDirectors: Restricts to directors only
 * - populateUser: Fetches full user document from database
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret key - load from environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Verify JWT Token Middleware
 * 
 * Extracts Bearer token from Authorization header, verifies signature,
 * and attaches decoded payload to req.user for use in route handlers.
 * 
 * Expected Header Format: Authorization: Bearer <jwt_token>
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = (req, res, next) => {
  // Extract token from "Bearer <token>" format in Authorization header
  const token = req.headers.authorization?.split(' ')[1];

  // Respond with 401 if no token provided
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify token signature against JWT_SECRET and decode
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user's email is verified
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified. Please verify your email before accessing this resource.' });
    }
    
    // Attach decoded user info to request object
    // Contains: userId, email, role
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Return 401 for invalid or expired tokens
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Role-Based Authorization Middleware Factory
 * 
 * Creates middleware function that checks if authenticated user
 * has one of the specified roles. Returns 403 Forbidden if
 * user's role is not in the allowed list.
 * 
 * @param {Array<String>} allowedRoles - List of roles with access
 * @returns {Function} - Middleware function for express route
 * 
 * Example Usage:
 * const checkRoles = authorizeRole(['manager', 'director']);
 * router.post('/procurement', checkRoles, createProcurement);
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // First check if user is authenticated (verifyToken ran)
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      // Return 403 Forbidden with detailed error message
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}` 
      });
    }

    // User has appropriate role, proceed to route handler
    next();
  };
};

/**
 * Only Managers Middleware
 * 
 * Restricts access to users with 'manager' or 'director' role.
 * Used for: Procurement recording, produce updates, manager reports
 */
const onlyManagers = authorizeRole(['manager']);

/**
 * Only Managers and Agents Middleware
 * 
 * Restricts access to users with 'manager', 'agent', or 'director' role.
 * Used for: Sales recording, credit sales recording
 */
const onlyManagersAndAgents = authorizeRole(['manager', 'agent']);

/**
 * Only Directors Middleware
 * 
 * Restricts access to users with 'director' role only.
 * Used for: Aggregated sales reports, company-wide analytics
 */
const onlyDirectors = authorizeRole(['director']);

/**
 * Populate User Data Middleware
 * 
 * Fetches complete user document from database using userId from JWT.
 * Attaches full user object to req.userData for use in route handlers.
 * 
 * @requires verifyToken must run before this middleware
 * 
 * Populates:
 * - req.userData: Complete user document including branch, contact, etc.
 * 
 * Example Usage:
 * router.post('/procurement', verifyToken, populateUser, onlyManagers, create);
 */
const populateUser = async (req, res, next) => {
  try {
    // Query database for user document using userId from JWT token
    const user = await User.findById(req.user.userId);
    
    // Handle case where user was deleted or doesn't exist
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Attach complete user document to request
    req.userData = user;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Return 500 for database query errors
    res.status(500).json({ error: error.message });
  }
};

// Export all middleware functions for use in routes
module.exports = {
  verifyToken,
  authorizeRole,
  onlyManagers,
  onlyManagersAndAgents,
  onlyDirectors,
  populateUser
};

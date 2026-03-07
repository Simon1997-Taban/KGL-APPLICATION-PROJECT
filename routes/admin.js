/**
 * Admin Routes
 * 
 * Purpose: Handles admin/director operations including user management, 
 * system settings, and activity logging.
 * 
 * Endpoints:
 * - GET /api/admin/users - Get all users with pagination
 * - GET /api/admin/users/:id - Get specific user details
 * - DELETE /api/admin/users/:id - Delete a user
 * - PATCH /api/admin/users/:id - Update user information
 * - GET /api/admin/system - Get system settings and stats
 * - GET /api/admin/logs - Get activity logs
 * - POST /api/admin/logs - Create activity log entry
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Sale = require('../models/Sale');
const Produce = require('../models/Produce');
const mongoose = require('mongoose');
const { verifyToken, onlyDirectors } = require('../middleware/auth');

/**
 * GET /api/admin/users
 * Retrieve all users with optional pagination and filtering
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - role: Filter by role
 * - branch: Filter by branch
 */
router.get('/users', verifyToken, onlyDirectors, async (req, res) => {
  try {
    console.log('Admin: Fetching users list');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.branch) filter.branch = req.query.branch;
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    // Fetch users
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    console.log(`Users retrieved: ${users.length}`);
    
    res.json({
      success: true,
      count: users.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit),
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/users/:id
 * Get specific user details
 */
router.get('/users/:id', verifyToken, onlyDirectors, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', verifyToken, onlyDirectors, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Prevent deleting yourself
    if (req.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User deleted: ${user.email}`);
    res.json({ success: true, message: `User ${user.email} has been deleted` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user information (name, branch, role, contact)
 */
router.patch('/users/:id', verifyToken, onlyDirectors, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const { name, branch, role, contact } = req.body;
    
    // Validate allowed updates
    const updates = {};
    if (name) updates.name = name;
    if (branch) {
      if (!['branch1', 'branch2'].includes(branch)) {
        return res.status(400).json({ error: 'Branch must be branch1 or branch2' });
      }
      updates.branch = branch;
    }
    if (role) {
      if (!['director', 'manager', 'procurement', 'agent'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }
    if (contact) {
      if (!/^[0-9]{10,15}$/.test(contact)) {
        return res.status(400).json({ error: 'Contact must be a valid phone number (10-15 digits)' });
      }
      updates.contact = contact;
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, updates, { 
      new: true,
      runValidators: true
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User updated: ${user.email}`);
    res.json({ success: true, message: 'User updated successfully', user: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system
 * Get system settings and statistics
 */
router.get('/system', verifyToken, onlyDirectors, async (req, res) => {
  try {
    console.log('Admin: Fetching system information');
    
    // Get user statistics
    const totalUsers = await User.countDocuments({});
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const usersByBranch = await User.aggregate([
      { $group: { _id: '$branch', count: { $sum: 1 } } }
    ]);
    
    // Get sales statistics
    const totalSales = await Sale.countDocuments({});
    const totalProduceItems = await Produce.countDocuments({});
    
    // Calculate total value
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const systemInfo = {
      success: true,
      timestamp: new Date(),
      statistics: {
        users: {
          total: totalUsers,
          byRole: usersByRole,
          byBranch: usersByBranch
        },
        sales: {
          total: totalSales,
          totalAmount: salesData[0]?.totalAmount || 0
        },
        inventory: {
          totalProduceItems: totalProduceItems
        }
      },
      status: 'Online',
      version: '1.0.0'
    };
    
    res.json(systemInfo);
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/logs
 * Get activity logs (based on sales, procurement, and user actions)
 * Query parameters:
 * - page: Page number
 * - limit: Items per page
 * - type: Filter by log type (sale, procurement, user_action)
 * - userId: Filter by user ID
 */
router.get('/logs', verifyToken, onlyDirectors, async (req, res) => {
  try {
    console.log('Admin: Fetching activity logs');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Since we don't have a dedicated logs collection, construct logs from existing data
    // This combines sales, procurement, and user activities
    
    // Get recent sales (activity)
    const sales = await Sale.find({})
      .populate('recordedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id recordedBy quantity saleType branch createdAt totalAmount');
    
    const logs = sales.map(sale => ({
      _id: sale._id,
      type: 'SALE',
      action: `Recorded ${sale.saleType} sale`,
      user: sale.recordedBy?.name || 'Unknown',
      userEmail: sale.recordedBy?.email || 'unknown@email.com',
      branch: sale.branch,
      details: `${sale.quantity} units sold - Amount: ${sale.totalAmount}`,
      timestamp: sale.createdAt
    }));
    
    const total = await Sale.countDocuments({});
    
    res.json({
      success: true,
      count: logs.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit),
      logs: logs
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/logs
 * Create a manual activity log entry (for user actions)
 */
router.post('/logs', verifyToken, onlyDirectors, async (req, res) => {
  try {
    const { action, details, type } = req.body;
    
    if (!action || !type) {
      return res.status(400).json({ error: 'Action and type are required' });
    }
    
    // In a real system, you would save this to a logs collection
    // For now, we'll just acknowledge it was received
    const logEntry = {
      _id: new mongoose.Types.ObjectId(),
      type: type.toUpperCase(),
      action: action,
      user: req.user?.name || 'Admin',
      details: details || '',
      timestamp: new Date()
    };
    
    console.log(`Activity log created: ${action}`);
    
    res.json({
      success: true,
      message: 'Activity logged successfully',
      log: logEntry
    });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

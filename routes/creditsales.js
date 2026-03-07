/**
 * Credit Sales Routes
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Handles deferred payment (credit) sales transactions.
 * Completely separate from regular sales for clear financial tracking.
 * Automatically reduces stock when credit sales are recorded.
 * Tracks buyer identity, due dates, and payment status.
 * Provides alerts for overdue payments.
 * 
 * Endpoints:
 * - POST /api/credit-sales - Record new credit sale
 * - GET /api/credit-sales - Get all credit sales with optional filters
 * - GET /api/credit-sales/agent/:agentId - Get credit sales by agent
 * - PUT /api/credit-sales/:id/status - Update payment status
 * - GET /api/credit-sales/alerts/overdue - Get overdue payment alerts
 * 
 * Status Values:
 * - pending: Awaiting payment, within due date
 * - paid: Payment received in full
 * - overdue: Past due date, payment outstanding
 * 
 * Access Control:
 * - All endpoints require JWT token (verifyToken)
 * - POST/PUT require manager, agent, or director role
 */

const express = require('express');
const router = express.Router();
const CreditSale = require('../models/CreditSale');
const Produce = require('../models/Produce');
const { verifyToken, populateUser, onlyManagersAndAgents } = require('../middleware/auth');
const { validateCreditSale } = require('../middleware/validators');

// Record a credit sale (Manager and Agent only)
router.post('/', verifyToken, populateUser, onlyManagersAndAgents, validateCreditSale, async (req, res) => {
  try {
    const {
      buyerName,
      email,
      nin,
      location,
      nationality,
      contact,
      produceName,
      tonnage,
      dispatchDate,
      returnDate,
      dueDate,
      branch
    } = req.body;

    // Enforce branch scope for managers/agents
    if (req.user.role === 'agent' && branch !== req.userData.branch) {
      return res.status(403).json({ error: 'You can only record credit sales for your assigned branch' });
    }

    // Find the produce item
    const produce = await Produce.findOne({ name: produceName, branch });

    if (!produce) {
      return res.status(404).json({ error: `Produce "${produceName}" not found in your branch` });
    }

    // Check if stock is available
    if (produce.stock < tonnage) {
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${produce.stock} tonnes, Requested: ${tonnage} tonnes` 
      });
    }

    // Ensure sale price set by manager is used
    if (!produce.salePrice) {
      return res.status(400).json({ error: 'Sale price not set for this produce. Ask manager to set a price first.' });
    }

    const finalAmountDue = (produce.salePrice || 0) * tonnage;

    const dispatch = dispatchDate ? new Date(dispatchDate) : new Date();
    const expectedReturn = new Date(returnDate || dueDate);

    // Create credit sale record
    const creditSale = new CreditSale({
      buyerName,
      email,
      nin,
      location,
      nationality,
      contact,
      amountDue: finalAmountDue,
      produce: produce._id,
      produceName,
      tonnage,
      salesAgent: req.user.userId,
      salesAgentName: req.userData.name,
      dueDate: expectedReturn,
      dispatchDate: dispatch,
      branch,
      status: 'pending'
    });

    // Reduce stock
    produce.stock -= tonnage;
    produce.updatedAt = new Date();

    // Save both records
    await creditSale.save();
    await produce.save();

    res.status(201).json({
      message: 'Credit sale recorded successfully',
      creditSale,
      remainingStock: produce.stock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all credit sales with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { branch, status } = req.query;
    const query = {};

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      query.status = status;
    }

    const creditSales = await CreditSale.find(query)
      .populate('produce', 'name type')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totals = {
      totalPending: creditSales.filter(cs => cs.status === 'pending').reduce((sum, cs) => sum + cs.amountDue, 0),
      totalOverdue: creditSales.filter(cs => cs.status === 'overdue').reduce((sum, cs) => sum + cs.amountDue, 0),
      totalDue: creditSales.reduce((sum, cs) => sum + cs.amountDue, 0)
    };

    res.json({
      count: creditSales.length,
      ...totals,
      creditSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get credit sales by agent
router.get('/agent/:agentId', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { branch, status } = req.query;

    const query = { salesAgent: agentId };

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      query.status = status;
    }

    const creditSales = await CreditSale.find(query)
      .populate('produce', 'name type')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    const totalDue = creditSales.reduce((sum, cs) => sum + cs.amountDue, 0);

    res.json({
      count: creditSales.length,
      totalDue,
      creditSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update credit sale status (Mark as paid/overdue)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const creditSale = await CreditSale.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('produce').populate('salesAgent', 'name email');

    if (!creditSale) {
      return res.status(404).json({ error: 'Credit sale not found' });
    }

    res.json({
      message: `Credit sale marked as ${status}`,
      creditSale
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overdue credit sales
router.get('/alerts/overdue', verifyToken, async (req, res) => {
  try {
    const { branch } = req.query;
    const query = { 
      status: { $in: ['pending', 'overdue'] },
      dueDate: { $lt: new Date() }
    };

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    const overdue = await CreditSale.find(query)
      .populate('produce', 'name')
      .populate('salesAgent', 'name email')
      .sort({ dueDate: 1 });

    const totalOverdue = overdue.reduce((sum, cs) => sum + cs.amountDue, 0);

    res.json({
      count: overdue.length,
      totalOverdue,
      overdue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

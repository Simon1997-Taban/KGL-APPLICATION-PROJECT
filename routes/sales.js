/**
 * Sales Routes (Regular Sales)
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Handles regular (immediate payment) sales transactions.
 * Automatically reduces stock from Produce inventory when sales are recorded.
 * Prevents selling items that don't have sufficient stock.
 * Validates that stock exists before allowing sale.
 * 
 * Endpoints:
 * - POST /api/sales - Record new sale with automatic stock reduction
 * - GET /api/sales - Get all sales with optional filters
 * - GET /api/sales/:id - Get specific sale details
 * - GET /api/sales/agent/:agentId - Get all sales by specific agent
 * 
 * Access Control:
 * - All endpoints require JWT token (verifyToken)
 * - POST/GET require manager, agent, or director role
 */

const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');
const Produce = require('../models/Produce');
const { verifyToken, populateUser, onlyManagersAndAgents } = require('../middleware/auth');
const { validateSale } = require('../middleware/validators');

// Record a sale (Manager and Agent only)
router.post('/', verifyToken, populateUser, onlyManagersAndAgents, validateSale, async (req, res) => {
  try {
    const { produceName, tonnage, buyerName, branch } = req.body;

    // Enforce branch scope for managers/agents
    if (req.user.role === 'agent' && branch !== req.userData.branch) {
      return res.status(403).json({ error: 'You can only record sales for your assigned branch' });
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

    // Ensure manager-set sale price is used
    if (!produce.salePrice) {
      return res.status(400).json({ error: 'Sale price not set for this produce. Ask manager to set a price first.' });
    }

    // Always calculate amount using manager price
    const calculatedAmount = (produce.salePrice || 0) * tonnage;

    // Create sale record
    const sale = new Sale({
      produce: produce._id,
      produceName,
      tonnage,
      amountPaid: calculatedAmount,
      buyerName,
      salesAgent: req.user.userId,
      salesAgentName: req.userData.name,
      branch,
      saleType: 'regular'
    });

    // Reduce stock
    produce.stock -= tonnage;
    produce.updatedAt = new Date();

    // Save both records
    await sale.save();
    await produce.save();

    res.status(201).json({
      message: 'Sale recorded successfully',
      sale,
      remainingStock: produce.stock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sales (with optional filters)
router.get('/', verifyToken, onlyManagersAndAgents, async (req, res) => {
  try {
    const { branch, saleType } = req.query;
    const query = {};

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    if (saleType && ['regular', 'credit'].includes(saleType)) {
      query.saleType = saleType;
    }

    const sales = await Sale.find(query)
      .populate('produce', 'name type salePrice stock')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Calculate total sales
    const totalSales = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);

    res.json({
      count: sales.length,
      totalSales,
      sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales by sales agent
router.get('/agent/:agentId', verifyToken, onlyManagersAndAgents, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { branch } = req.query;

    const query = { salesAgent: agentId };

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    const sales = await Sale.find(query)
      .populate('produce', 'name type salePrice')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    const totalSales = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);

    res.json({
      count: sales.length,
      totalSales,
      sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined customer purchase history (cash + credit)
router.get('/customers', verifyToken, onlyManagersAndAgents, async (req, res) => {
  try {
    const { branch } = req.query;
    const query = {};
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    const [sales, creditSales] = await Promise.all([
      Sale.find(query).lean(),
      CreditSale.find(query).lean()
    ]);

    const customers = [
      ...sales.map(s => ({
        buyerName: s.buyerName,
        produceName: s.produceName,
        tonnage: s.tonnage,
        amount: s.amountPaid,
        saleType: 'cash',
        status: 'paid',
        createdAt: s.createdAt,
        branch: s.branch
      })),
      ...creditSales.map(cs => ({
        buyerName: cs.buyerName,
        produceName: cs.produceName,
        tonnage: cs.tonnage,
        amount: cs.amountDue,
        saleType: 'credit',
        status: cs.status,
        dueDate: cs.dueDate,
        nin: cs.nin,
        contact: cs.contact,
        createdAt: cs.createdAt,
        branch: cs.branch
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ count: customers.length, customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sale by ID
// NOTE: Keep this route AFTER more specific paths like "/customers"
// to avoid Express routing it as a dynamic :id match.
router.get('/:id', verifyToken, onlyManagersAndAgents, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('produce')
      .populate('salesAgent', 'name email');

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

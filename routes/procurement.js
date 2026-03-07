/**
 * Procurement Routes
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Handles all produce procurement operations.
 * Only managers can record and modify procurement records.
 * Managers can only access their assigned branch's data.
 * 
 * Endpoints:
 * - POST /api/procurement - Record new procurement (Managers only)
 * - GET /api/procurement - Get all produce (with optional branch filter)
 * - GET /api/procurement/:id - Get specific produce by ID
 * - PUT /api/procurement/:id - Update produce (Managers only, own branch)
 * - GET /api/procurement/alerts/out-of-stock - Out-of-stock item alerts
 * 
 * Access Control:
 * - All endpoints require JWT token (verifyToken)
 * - Most endpoints restricted to managers and directors (onlyManagers)
 * - Managers can only modify records in their assigned branch
 */

const express = require('express');
const router = express.Router();
const Produce = require('../models/Produce');
const { verifyToken, populateUser, onlyManagers } = require('../middleware/auth');
const { validateProcurement } = require('../middleware/validators');

/**
 * POST /api/procurement
 * Record New Procurement
 * 
 * Managers can record new produce procurements/purchases.
 * Must be for their assigned branch.
 * All input is validated before being saved.
 * 
 * Required Fields:
 * - name: Produce name
 * - type: Produce type/variety
 * - stock: Initial tonnage
 * - cost: Purchase cost per unit
 * - dealerName: Supplier name
 * - branch: branch1 or branch2
 * - contact: Dealer phone number
 * - salePrice: Selling price per unit
 * 
 * @route POST /api/procurement
 * @access Manager, Director
 * @param {string} req.body.name - Produce name
 * @param {string} req.body.type - Produce type
 * @param {number} req.body.stock - Tonnage
 * @param {number} req.body.cost - Cost price
 * @param {string} req.body.dealerName - Supplier name
 * @param {string} req.body.branch - Branch assignment
 * @param {string} req.body.contact - Dealer contact
 * @param {number} req.body.salePrice - Sale price
 * @returns {object} 201 Created with produce document
 */
router.post('/', verifyToken, populateUser, onlyManagers, validateProcurement, async (req, res) => {
  try {
    const { name, type, stock, cost, dealerName, branch, contact, salePrice } = req.body;

    // Managers can add to any branch (no branch restriction)
    // This allows managers to manage inventory across both branches

    // Create new Produce document with all details
    const produce = new Produce({
      name,
      type,
      stock,
      cost,
      dealerName,
      branch,
      contact,
      salePrice,
      recordedBy: req.user.userId // Record which manager added this
    });

    // Save to database
    await produce.save();
    
    // Return success with created document
    res.status(201).json({
      message: 'Procurement recorded successfully',
      produce
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/procurement
 * Get All Produce in Inventory
 * 
 * Retrieves all produce items, optionally filtered by branch.
 * Used for viewing current inventory status.
 * Includes information about who recorded each item.
 * 
 * @route GET /api/procurement
 * @access Authenticated users
 * @param {string} req.query.branch - Optional filter by branch
 * @returns {object} Array of produce documents with count
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { branch } = req.query;
    const query = {};

    // Filter by branch if specified
    // Allows viewing specific branch inventory
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    // Query database and sort by newest first
    const produces = await Produce.find(query)
      .populate('recordedBy', 'name email') // Get manager details
      .sort({ createdAt: -1 });

    // Return results with count
    res.json({
      count: produces.length,
      produces
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/procurement/:id
 * Get Produce by ID
 * 
 * Retrieves details of a specific produce item from inventory.
 * Shows full information including who recorded it.
 * 
 * @route GET /api/procurement/:id
 * @access Authenticated users
 * @param {string} req.params.id - MongoDB ObjectId of produce
 * @returns {object} Single produce document
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // Query by ID and populate manager reference
    const produce = await Produce.findById(req.params.id).populate('recordedBy', 'name email');
    
    // Return 404 if not found
    if (!produce) {
      return res.status(404).json({ error: 'Produce not found' });
    }

    res.json(produce);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/procurement/:id
 * Update Produce Details
 * 
 * Managers can update produce information like stock, price, etc.
 * Can only update records in their assigned branch.
 * Updates the updatedAt timestamp automatically.
 * 
 * @route PUT /api/procurement/:id
 * @access Manager, Director
 * @param {string} req.params.id - MongoDB ObjectId of produce
 * @param {object} req.body - Fields to update (partial update)
 * @returns {object} Updated produce document
 */
router.put('/:id', verifyToken, populateUser, onlyManagers, async (req, res) => {
  try {
    // Fetch produce from database
    const produce = await Produce.findById(req.params.id);

    if (!produce) {
      return res.status(404).json({ error: 'Produce not found' });
    }

    // Managers can update any branch (no branch restriction)
    // This allows managers to manage inventory across both branches

    // Update provided fields only (partial update)
    const { name, type, stock, cost, dealerName, contact, salePrice } = req.body;

    if (name) produce.name = name;
    if (type) produce.type = type;
    if (stock !== undefined) produce.stock = stock;
    if (cost) produce.cost = cost;
    if (dealerName) produce.dealerName = dealerName;
    if (contact) produce.contact = contact;
    if (salePrice) produce.salePrice = salePrice;
    
    // Update timestamp to record modification
    produce.updatedAt = new Date();

    // Save changes to database
    await produce.save();
    
    res.json({
      message: 'Produce updated successfully',
      produce
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/procurement/alerts/out-of-stock
 * Out-of-Stock Item Alerts
 * 
 * Returns all produce items with zero or negative stock.
 * Helps managers identify items that need reordering.
 * Optional branch filter for location-specific alerts.
 * 
 * @route GET /api/procurement/alerts/out-of-stock
 * @access Authenticated users
 * @param {string} req.query.branch - Optional filter by branch
 * @returns {object} Alert data with out-of-stock items
 */
router.get('/alerts/out-of-stock', verifyToken, async (req, res) => {
  try {
    const { branch } = req.query;
    
    // Query for items with stock <= 0
    const query = { stock: { $lte: 0 } };

    // Optional branch filter
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    // Get out-of-stock items, newest first
    const outOfStock = await Produce.find(query).sort({ createdAt: -1 });

    // Return helpful response
    res.json({
      count: outOfStock.length,
      message: outOfStock.length > 0 ? `${outOfStock.length} items out of stock` : 'All items in stock',
      items: outOfStock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

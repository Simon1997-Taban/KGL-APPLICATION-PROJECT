/**
 * Reports & Analytics Routes
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonlodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Purpose: Provides comprehensive reporting and analytics endpoints.
 * Directors can view company-wide reports and aggregated data.
 * Managers can view branch-specific reports and performance metrics.
 * Implements aggregation queries for sales summaries and performance tracking.
 * 
 * Endpoints:
 * - GET /api/reports/sales-summary - Company-wide sales aggregation (Directors)
 * - GET /api/reports/branch-report - Branch sales (Managers & Directors)
 * - GET /api/reports/inventory - Inventory status and valuation
 * - GET /api/reports/agent-performance - Agent performance metrics
 * - GET /api/reports/dashboard-metrics - Live dashboard widgets (Managers/Agents/Procurement/Directors)
 * 
 * Access Control:
 * - All endpoints require JWT token (verifyToken)
 * - sales-summary restricted to directors only
 * - Other endpoints available to managers and directors
 * 
 * Filtering Options:
 * - branch: Filter by branch1 or branch2
 * - startDate: Include only transactions from this date
 * - endDate: Include only transactions up to this date
 * - status: Filter credit sales by status (pending/paid/overdue)
 */

const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');
const Produce = require('../models/Produce');
const { verifyToken, populateUser, onlyDirectors, authorizeRole } = require('../middleware/auth');

// Role guard for dashboard metrics (managers, agents, procurement, directors)
const dashboardRoles = authorizeRole(['director', 'manager', 'agent', 'procurement']);

// Helpers
const startOfDay = (d) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const sumByDateRange = (items, field, start, end, amountField) =>
  items.reduce((sum, item) => {
    const ts = new Date(item[field]);
    if (ts >= start && (!end || ts < end)) {
      return sum + (item[amountField] || 0);
    }
    return sum;
  }, 0);

// Dashboard metrics for unified UI
router.get('/dashboard-metrics', verifyToken, populateUser, dashboardRoles, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Branch scoping
    let branch = req.query.branch;
    if (req.user.role !== 'director') {
      branch = req.userData.branch;
    }
    const branchFilter = branch && ['branch1', 'branch2'].includes(branch) ? { branch } : {};

    const [sales, creditPaid, creditStatuses, lowStock, outOfStock] = await Promise.all([
      // Pull month worth of sales for aggregation
      Sale.find({ ...branchFilter, createdAt: { $gte: monthStart } }).lean(),
      CreditSale.find({ ...branchFilter, status: 'paid', updatedAt: { $gte: monthStart } }).lean(),
      CreditSale.find({ ...branchFilter, status: { $in: ['pending', 'overdue'] } }).lean(),
      Produce.find({ ...branchFilter, stock: { $gt: 0, $lte: 5 } }).sort({ stock: 1 }).lean(),
      Produce.find({ ...branchFilter, stock: { $lte: 0 } }).lean()
    ]);

    // Revenue totals (regular sales use createdAt, credit revenue uses updatedAt when paid)
    const revenueToday = sumByDateRange(sales, 'createdAt', todayStart, null, 'amountPaid') +
      sumByDateRange(creditPaid, 'updatedAt', todayStart, null, 'amountDue');
    const revenueWeek = sumByDateRange(sales, 'createdAt', weekStart, null, 'amountPaid') +
      sumByDateRange(creditPaid, 'updatedAt', weekStart, null, 'amountDue');
    const revenueMonth = sumByDateRange(sales, 'createdAt', monthStart, null, 'amountPaid') +
      sumByDateRange(creditPaid, 'updatedAt', monthStart, null, 'amountDue');

    // Counts
    const salesTodayCount = sales.filter(s => new Date(s.createdAt) >= todayStart).length;
    const creditClearedLastHour = creditPaid.filter(c => new Date(c.updatedAt) >= hourAgo).length;
    const pendingCredit = creditStatuses.filter(c => c.status === 'pending');
    const overdueCredit = creditStatuses.filter(c => c.status === 'overdue');

    // Yesterday revenue (for delta)
    const revenueYesterday = sumByDateRange(sales, 'createdAt', yesterdayStart, todayStart, 'amountPaid') +
      sumByDateRange(creditPaid, 'updatedAt', yesterdayStart, todayStart, 'amountDue');

    const highlights = [];
    const branchLabel = branch || 'all branches';
    if (revenueYesterday > 0) {
      const delta = ((revenueToday - revenueYesterday) / revenueYesterday) * 100;
      highlights.push(`${branchLabel} revenue ${delta >= 0 ? 'up' : 'down'} ${delta.toFixed(1)}% vs yesterday`);
    } else {
      highlights.push(`${branchLabel} revenue today: ${revenueToday.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`);
    }
    highlights.push(`Credit sales cleared in last hour: ${creditClearedLastHour}`);
    if (lowStock.length > 0) {
      const names = lowStock.slice(0, 3).map(p => p.name).join(', ');
      highlights.push(`${lowStock.length} product${lowStock.length > 1 ? 's' : ''} nearing stock-out: ${names}${lowStock.length > 3 ? '…' : ''}`);
    }

    res.json({
      branch: branch || 'all',
      revenue: {
        today: revenueToday,
        week: revenueWeek,
        month: revenueMonth
      },
      sales: {
        todayCount: salesTodayCount,
        monthCount: sales.length
      },
      credits: {
        clearedLastHour: creditClearedLastHour,
        pendingCount: pendingCredit.length,
        pendingTotal: pendingCredit.reduce((sum, c) => sum + c.amountDue, 0),
        overdueCount: overdueCredit.length,
        overdueTotal: overdueCredit.reduce((sum, c) => sum + c.amountDue, 0)
      },
      inventory: {
        lowStock: lowStock.map(p => ({ name: p.name, stock: p.stock, branch: p.branch })),
        outOfStock: outOfStock.map(p => ({ name: p.name, stock: p.stock, branch: p.branch }))
      },
      highlights
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated sales report (Directors only)
router.get('/sales-summary', verifyToken, populateUser, onlyDirectors, async (req, res) => {
  try {
    const { branch, startDate, endDate } = req.query;

    const query = {};
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get regular sales
    const sales = await Sale.find(query)
      .populate('produce', 'name type salePrice')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Get credit sales
    const creditSales = await CreditSale.find(query)
      .populate('produce', 'name type')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Calculate metrics
    const totalRegularSales = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const totalCreditSales = creditSales.reduce((sum, cs) => sum + cs.amountDue, 0);
    const paidCreditSales = creditSales.filter(cs => cs.status === 'paid').reduce((sum, cs) => sum + cs.amountDue, 0);
    const pendingCreditSales = creditSales.filter(cs => cs.status === 'pending').reduce((sum, cs) => sum + cs.amountDue, 0);

    // Sales by branch
    const salesByBranch = {};
    sales.forEach(sale => {
      if (!salesByBranch[sale.branch]) {
        salesByBranch[sale.branch] = { count: 0, total: 0 };
      }
      salesByBranch[sale.branch].count += 1;
      salesByBranch[sale.branch].total += sale.amountPaid;
    });

    // Sales by agent
    const salesByAgent = {};
    sales.forEach(sale => {
      const agentName = sale.salesAgentName;
      if (!salesByAgent[agentName]) {
        salesByAgent[agentName] = { count: 0, total: 0 };
      }
      salesByAgent[agentName].count += 1;
      salesByAgent[agentName].total += sale.amountPaid;
    });

    res.json({
      summary: {
        totalRegularSales,
        totalCreditSales,
        totalRevenue: totalRegularSales + paidCreditSales,
        pendingCreditSales,
        overdueCreditSales: creditSales.filter(cs => cs.status === 'overdue').reduce((sum, cs) => sum + cs.amountDue, 0)
      },
      salesByBranch,
      salesByAgent,
      totalTransactions: sales.length + creditSales.length,
      regularSalesCount: sales.length,
      creditSalesCount: creditSales.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get branch-wise sales report (Directors only; managers removed per updated role scope)
router.get('/branch-report', verifyToken, populateUser, onlyDirectors, async (req, res) => {
  try {
    let branch = req.query.branch;

    // If manager, restrict to their branch
    if (req.user.role === 'manager' && !branch) {
      branch = req.userData.branch;
    } else if (req.user.role === 'manager' && branch !== req.userData.branch) {
      return res.status(403).json({ error: 'Managers can only view reports for their own branch' });
    }

    const query = {};
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    // Regular sales
    const sales = await Sale.find(query)
      .populate('produce', 'name type salePrice stock')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Credit sales
    const creditSales = await CreditSale.find(query)
      .populate('produce', 'name type')
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Produce inventory
    const produce = await Produce.find(query).sort({ createdAt: -1 });

    // Calculate metrics
    const totalRegularSales = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const totalCreditSales = creditSales.reduce((sum, cs) => sum + cs.amountDue, 0);

    res.json({
      branch: branch || 'all',
      summary: {
        totalRegularSales,
        totalCreditSales,
        totalRevenue: totalRegularSales + creditSales.filter(cs => cs.status === 'paid').reduce((sum, cs) => sum + cs.amountDue, 0),
        pendingCredit: creditSales.filter(cs => cs.status === 'pending').reduce((sum, cs) => sum + cs.amountDue, 0),
        overdueCredit: creditSales.filter(cs => cs.status === 'overdue').reduce((sum, cs) => sum + cs.amountDue, 0)
      },
      inventory: {
        totalItems: produce.length,
        outOfStock: produce.filter(p => p.stock <= 0).length,
        lowStock: produce.filter(p => p.stock > 0 && p.stock < 10).length
      },
      transactions: {
        regularSalesCount: sales.length,
        creditSalesCount: creditSales.length,
        totalTransactions: sales.length + creditSales.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory report (Directors only)
router.get('/inventory', verifyToken, onlyDirectors, async (req, res) => {
  try {
    const { branch } = req.query;
    const query = {};

    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    }

    const produce = await Produce.find(query).sort({ name: 1 });

    const outOfStock = produce.filter(p => p.stock <= 0);
    const lowStock = produce.filter(p => p.stock > 0 && p.stock < 10);
    const adequateStock = produce.filter(p => p.stock >= 10);

    // Total value calculations
    const totalValue = produce.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const outOfStockValue = outOfStock.reduce((sum, p) => sum + (p.stock * p.cost), 0);

    res.json({
      summary: {
        totalItems: produce.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        adequateStock: adequateStock.length,
        totalValue,
        outOfStockValue
      },
      items: {
        outOfStock,
        lowStock,
        adequateStock
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance report (sales by agent over time) - Directors only
router.get('/agent-performance', verifyToken, populateUser, onlyDirectors, async (req, res) => {
  try {
    const { branch, startDate, endDate } = req.query;

    const query = {};
    if (branch && ['branch1', 'branch2'].includes(branch)) {
      query.branch = branch;
    } else if (req.user.role === 'manager') {
      query.branch = req.userData.branch;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get sales by agent
    const sales = await Sale.find(query)
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Get credit sales by agent
    const creditSales = await CreditSale.find(query)
      .populate('salesAgent', 'name email')
      .sort({ createdAt: -1 });

    // Aggregate data
    const agentPerformance = {};

    sales.forEach(sale => {
      const agentId = sale.salesAgent._id.toString();
      if (!agentPerformance[agentId]) {
        agentPerformance[agentId] = {
          name: sale.salesAgent.name,
          email: sale.salesAgent.email,
          regularSalesCount: 0,
          regularSalesTotal: 0,
          creditSalesCount: 0,
          creditSalesTotal: 0
        };
      }
      agentPerformance[agentId].regularSalesCount += 1;
      agentPerformance[agentId].regularSalesTotal += sale.amountPaid;
    });

    creditSales.forEach(cs => {
      const agentId = cs.salesAgent._id.toString();
      if (!agentPerformance[agentId]) {
        agentPerformance[agentId] = {
          name: cs.salesAgent.name,
          email: cs.salesAgent.email,
          regularSalesCount: 0,
          regularSalesTotal: 0,
          creditSalesCount: 0,
          creditSalesTotal: 0
        };
      }
      agentPerformance[agentId].creditSalesCount += 1;
      agentPerformance[agentId].creditSalesTotal += cs.amountDue;
    });

    const performance = Object.values(agentPerformance).map(agent => ({
      ...agent,
      totalSales: agent.regularSalesTotal + agent.creditSalesTotal,
      totalTransactions: agent.regularSalesCount + agent.creditSalesCount
    }));

    res.json({
      count: performance.length,
      performance: performance.sort((a, b) => b.totalSales - a.totalSales)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

// Attempt to load the CORS package; fall back to a simple CORS middleware if not installed.
let cors;
try {
  cors = require('cors');
} catch (e) {
  console.warn('Optional dependency "cors" not found; using fallback CORS middleware. Install with: npm install cors');
  cors = null;
}

const app = express();

// Enable CORS for local development. In production, configure origin whitelist.
if (cors) {
  app.use(cors());
} else {
  // Simple permissive CORS for local development. Replace with a stricter policy in production.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Middleware - order matters!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add debug logging for requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  // Prevent caching of HTML files
  if (req.path.endsWith('.html') || req.path === '/login' || req.path === '/register') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kgl';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Import routes
const authRoutes = require('./routes/auth');
const procurementRoutes = require('./routes/procurement');
const salesRoutes = require('./routes/sales');
const creditSalesRoutes = require('./routes/creditsales');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/credit-sales', creditSalesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

// Landing page - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Public pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'register.html'));
});

// Unified dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'dashboard.html'));
});

// Legacy routes redirect to the unified dashboard
app.get(['/manager-dashboard', '/director-dashboard', '/agent-dashboard', '/procurement-dashboard'], (req, res) => {
  res.redirect('/dashboard');
});

app.get('/record-sale', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'record-sale.html'));
});

app.get('/inventory', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'inventory.html'));
});

app.get('/credit-sales', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'credit-sales.html'));
});

app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'users.html'));
});

app.get('/sales-report', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'sales-report.html'));
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('\n📚 API Endpoints:');
  console.log('\n🔐 Authentication:');
  console.log('  POST   /api/auth/register          - Register new user');
  console.log('  POST   /api/auth/login             - Login user');
  console.log('  GET    /api/auth/profile/:userId   - Get user profile');
  console.log('\n📦 Procurement (Managers Only):');
  console.log('  POST   /api/procurement            - Record procurement');
  console.log('  GET    /api/procurement            - Get all produce');
  console.log('  GET    /api/procurement/:id        - Get produce by ID');
  console.log('  PUT    /api/procurement/:id        - Update produce');
  console.log('  GET    /api/procurement/alerts/out-of-stock - Out of stock alerts');
  console.log('\n💰 Sales (Managers & Agents):');
  console.log('  POST   /api/sales                  - Record regular sale');
  console.log('  GET    /api/sales                  - Get all sales');
  console.log('  GET    /api/sales/:id              - Get sale by ID');
  console.log('  GET    /api/sales/agent/:agentId   - Get sales by agent');
  console.log('\n📋 Credit Sales (Managers & Agents):');
  console.log('  POST   /api/credit-sales           - Record credit sale');
  console.log('  GET    /api/credit-sales           - Get all credit sales');
  console.log('  GET    /api/credit-sales/agent/:agentId - Get credit sales by agent');
  console.log('  PUT    /api/credit-sales/:id/status - Update credit sale status');
  console.log('  GET    /api/credit-sales/alerts/overdue - Overdue alerts');
  console.log('\n📊 Reports (Directors & Managers):');
  console.log('  GET    /api/reports/sales-summary  - Aggregated sales report (Directors)');
  console.log('  GET    /api/reports/branch-report  - Branch sales report');
  console.log('  GET    /api/reports/inventory      - Inventory report');
  console.log('  GET    /api/reports/agent-performance - Agent performance report');
  console.log('\n🎯 Dashboards:');
  console.log('  GET    /login                      - Login page');
  console.log('  GET    /register                   - Register page');
  console.log('  GET    /manager-dashboard          - Manager dashboard');
  console.log('  GET    /director-dashboard         - Director dashboard');
  console.log('  GET    /procurement-dashboard      - Procurement dashboard');
  console.log('  GET    /agent-dashboard            - Sales Agent dashboard\n');
});

// Central error handler to log errors and return JSON responses
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

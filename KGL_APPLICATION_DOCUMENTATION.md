# KGL Application - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Implementation](#security-implementation)
8. [Key Code Sections](#key-code-sections)

---

## System Overview

**Application Name:** KGL Inventory & Sales Management System  
**Purpose:** Multi-branch inventory management with role-based access control  
**Technology Stack:**
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3

**Branches:**
- Matugga (branch1)
- Maganjo (branch2)

---

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  (HTML/CSS/JavaScript - Role-Based UI)                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
┌────────────────────▼────────────────────────────────────┐
│              Express.js Server (Node.js)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT)                  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authorization Middleware (Role-Based)            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Routes (Sales, Inventory, Reports, etc.)    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼────────────────────────────────────┐
│                   MongoDB Database                       │
│  Collections: Users, Sales, CreditSales, Produce        │
└─────────────────────────────────────────────────────────┘
```

### File Structure
```
KGL_L/
├── server.js                 # Main application entry point
├── models/                   # Database schemas
│   ├── User.js              # User authentication & roles
│   ├── Sale.js              # Cash sales transactions
│   ├── CreditSale.js        # Credit sales with payment tracking
│   └── Produce.js           # Inventory/products
├── routes/                   # API endpoints
│   ├── auth.js              # Login/Register
│   ├── sales.js             # Sales operations
│   ├── creditsales.js       # Credit sales management
│   ├── procurement.js       # Inventory management
│   ├── reports.js           # Analytics & reports
│   └── admin.js             # User management
├── middleware/               # Request processing
│   ├── auth.js              # JWT verification & role checks
│   └── validators.js        # Input validation
└── login/                    # Frontend pages
    ├── dashboard.html       # Role-based unified dashboard
    ├── record-sale.html     # Sales recording interface
    ├── inventory.html       # Inventory management
    ├── credit-sales.html    # Credit payment tracking
    ├── sales-report.html    # Sales history & receipts
    └── users.html           # User management
```

---

## User Roles & Permissions

### 1. Director (View-Only)
**Access Level:** Company-wide, Read-only

**Permissions:**
- ✅ View all sales reports (both branches)
- ✅ View aggregated analytics
- ✅ View branch performance comparison
- ✅ View agent performance metrics
- ✅ Print comprehensive reports
- ✅ View inventory status
- ❌ Cannot add/edit/delete any data
- ❌ Cannot record sales
- ❌ Cannot manage inventory
- ❌ Cannot manage users

**Dashboard Access:**
- Overview (metrics)
- Activity Report
- Sales (view only)
- Team Performance
- Alerts

### 2. Manager (Full Control)
**Access Level:** Both branches, Full CRUD operations

**Permissions:**
- ✅ Add/update inventory for ANY branch
- ✅ Record sales for ANY branch
- ✅ Record credit sales for ANY branch
- ✅ Update credit payment status
- ✅ Add new users (agents, managers, procurement)
- ✅ Set product prices
- ✅ View all reports
- ✅ Print receipts and reports

**Dashboard Access:**
- Overview
- Activity Report
- Sales
- Team Performance
- Alerts
- + Record Sale
- Inventory Management
- Credit Sales
- Manage Users
- Sales Report

### 3. Sales Agent (Branch-Restricted)
**Access Level:** Assigned branch only, Limited operations

**Permissions:**
- ✅ Record cash sales (own branch only)
- ✅ Record credit sales (own branch only)
- ✅ View own sales history
- ✅ Print receipts after sale
- ❌ Cannot access other branches
- ❌ Cannot manage inventory
- ❌ Cannot add users
- ❌ Cannot update credit status

**Dashboard Access:**
- Overview
- Sales (own branch)
- Alerts
- + Record Sale
- Sales Report (own sales)

### 4. Procurement Officer
**Access Level:** Inventory only

**Permissions:**
- ✅ View inventory
- ✅ Add products
- ✅ Update stock levels
- ❌ Cannot record sales
- ❌ Cannot manage users
- ❌ Cannot update credit status

**Dashboard Access:**
- Overview
- Alerts
- Inventory Management

---

## Core Features

### 1. Authentication System
**File:** `routes/auth.js`

**Features:**
- User registration with role assignment
- Secure password hashing (bcrypt)
- JWT token generation
- Profile photo upload
- Branch assignment

**Key Code:**
```javascript
// Password hashing before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// JWT token generation
const token = jwt.sign(
  { userId: user._id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

### 2. Sales Management
**Files:** `routes/sales.js`, `routes/creditsales.js`

**Cash Sales:**
- Immediate payment transactions
- Automatic stock reduction
- Manager-set pricing enforced
- Receipt generation

**Credit Sales:**
- Deferred payment tracking
- Customer information capture (NIN, contact, nationality)
- Due date management
- Payment status updates (Pending → Paid)
- Overdue detection

**Key Code:**
```javascript
// Stock validation before sale
if (produce.stock < tonnage) {
  return res.status(400).json({ 
    error: `Insufficient stock. Available: ${produce.stock}` 
  });
}

// Automatic stock reduction
produce.stock -= tonnage;
await produce.save();
```

### 3. Inventory Management
**File:** `routes/procurement.js`

**Features:**
- Multi-branch inventory tracking
- Stock level monitoring
- Color-coded alerts (OUT/LOW/OK)
- Price management
- Dealer information tracking
- Quick stock updates

**Stock Levels:**
- OUT OF STOCK: stock ≤ 0 (Red)
- LOW STOCK: 0 < stock ≤ 5 (Yellow)
- IN STOCK: stock > 5 (Green)

**Key Code:**
```javascript
// Manager can add to any branch (no restriction)
const produce = new Produce({
  name, type, stock, cost, dealerName,
  branch, contact, salePrice,
  recordedBy: req.user.userId
});
await produce.save();
```

### 4. Role-Based Access Control
**File:** `middleware/auth.js`

**Implementation:**
```javascript
// JWT verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
};

// Role authorization
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Specific role middlewares
const onlyManagers = authorizeRole(['manager']);
const onlyManagersAndAgents = authorizeRole(['manager', 'agent']);
const onlyDirectors = authorizeRole(['director']);
```

### 5. Dashboard Metrics
**File:** `routes/reports.js`

**Real-time Metrics:**
- Today's revenue
- Weekly revenue
- Monthly revenue
- Sales count
- Credit sales status
- Inventory alerts
- Branch performance

**Key Code:**
```javascript
// Revenue calculation with date ranges
const revenueToday = sumByDateRange(
  sales, 'createdAt', todayStart, null, 'amountPaid'
) + sumByDateRange(
  creditPaid, 'updatedAt', todayStart, null, 'amountDue'
);

// Dynamic highlights generation
if (revenueYesterday > 0) {
  const delta = ((revenueToday - revenueYesterday) / revenueYesterday) * 100;
  highlights.push(`Revenue ${delta >= 0 ? 'up' : 'down'} ${delta.toFixed(1)}%`);
}
```

### 6. Receipt & Report Printing
**File:** `login/sales-report.html`, `login/record-sale.html`

**Features:**
- Individual receipt printing
- Thermal printer compatible
- Full report printing
- Print-friendly styling

**Receipt Format:**
```
═══════════════════════
    KGL RECEIPT
═══════════════════════
Date: 2024-01-15 10:30
Branch: Matugga
───────────────────────
Buyer: John Doe
Contact: 0700123456
NIN: CM12345678
───────────────────────
Product: Maize
Quantity: 50 units
Type: CASH
───────────────────────
TOTAL: UGX 500,000
───────────────────────
Thank you for business!
```

---

## Database Schema

### User Collection
```javascript
{
  name: String,           // Full name
  email: String,          // Unique email
  password: String,       // Hashed password
  role: String,           // director|manager|agent|procurement
  branch: String,         // branch1|branch2
  contact: String,        // Phone number
  photo: String,          // Profile photo path
  createdAt: Date
}
```

### Sale Collection (Cash Sales)
```javascript
{
  produce: ObjectId,      // Reference to Produce
  produceName: String,    // Denormalized for history
  tonnage: Number,        // Quantity sold
  amountPaid: Number,     // Total amount
  buyerName: String,      // Customer name
  salesAgent: ObjectId,   // Reference to User
  salesAgentName: String, // Denormalized
  branch: String,         // branch1|branch2
  saleType: String,       // 'regular'
  createdAt: Date
}
```

### CreditSale Collection
```javascript
{
  buyerName: String,      // Customer name
  email: String,          // Customer email
  nin: String,            // National ID
  nationality: String,    // Customer nationality
  location: String,       // Address
  contact: String,        // Phone number
  amountDue: Number,      // Total amount owed
  produce: ObjectId,      // Reference to Produce
  produceName: String,    // Denormalized
  tonnage: Number,        // Quantity
  salesAgent: ObjectId,   // Reference to User
  salesAgentName: String, // Denormalized
  dueDate: Date,          // Payment deadline
  dispatchDate: Date,     // Delivery date
  branch: String,         // branch1|branch2
  status: String,         // pending|paid|overdue
  createdAt: Date,
  updatedAt: Date
}
```

### Produce Collection (Inventory)
```javascript
{
  name: String,           // Product name
  type: String,           // Product variety
  stock: Number,          // Available quantity
  cost: Number,           // Purchase cost
  dealerName: String,     // Supplier name
  branch: String,         // branch1|branch2
  contact: String,        // Dealer phone
  salePrice: Number,      // Selling price (manager-set)
  recordedBy: ObjectId,   // Reference to User
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/profile/:userId   - Get user profile
```

### Sales
```
POST   /api/sales                  - Record cash sale
GET    /api/sales                  - Get all sales
GET    /api/sales/:id              - Get sale by ID
GET    /api/sales/agent/:agentId   - Get sales by agent
GET    /api/sales/customers        - Get purchase history
```

### Credit Sales
```
POST   /api/credit-sales           - Record credit sale
GET    /api/credit-sales           - Get all credit sales
GET    /api/credit-sales/agent/:id - Get by agent
PUT    /api/credit-sales/:id/status - Update payment status
GET    /api/credit-sales/alerts/overdue - Get overdue sales
```

### Procurement (Inventory)
```
POST   /api/procurement            - Add inventory
GET    /api/procurement            - Get all inventory
GET    /api/procurement/:id        - Get by ID
PUT    /api/procurement/:id        - Update inventory
GET    /api/procurement/alerts/out-of-stock - Get alerts
```

### Reports
```
GET    /api/reports/sales-summary  - Aggregated sales (Directors)
GET    /api/reports/branch-report  - Branch performance
GET    /api/reports/inventory      - Inventory status
GET    /api/reports/agent-performance - Agent metrics
GET    /api/reports/dashboard-metrics - Live dashboard data
```

### Admin
```
GET    /api/admin/users            - Get all users
GET    /api/admin/users/:id        - Get user by ID
DELETE /api/admin/users/:id        - Delete user
PATCH  /api/admin/users/:id        - Update user
GET    /api/admin/system           - System statistics
```

---

## Security Implementation

### 1. Password Security
```javascript
// Bcrypt hashing with salt rounds
const hashedPassword = await bcrypt.hash(password, 10);

// Password comparison
const isMatch = await bcrypt.compare(password, user.password);
```

### 2. JWT Authentication
```javascript
// Token generation
const token = jwt.sign(
  { userId, email, role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// Token verification
const decoded = jwt.verify(token, JWT_SECRET);
```

### 3. Input Validation
```javascript
// Email validation
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  errors.push('Email must be valid');
}

// Phone validation
if (!/^[0-9]{10,15}$/.test(contact)) {
  errors.push('Contact must be 10-15 digits');
}

// Stock validation
if (produce.stock < tonnage) {
  return res.status(400).json({ error: 'Insufficient stock' });
}
```

### 4. Branch Access Control
```javascript
// Agents restricted to their branch
if (req.user.role === 'agent' && branch !== req.userData.branch) {
  return res.status(403).json({ 
    error: 'You can only record sales for your assigned branch' 
  });
}

// Managers can access any branch (no restriction)
```

---

## Key Code Sections

### 1. Server Initialization (server.js)
```javascript
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/reports', reportsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 2. Sale Recording with Stock Reduction
```javascript
// Find product
const produce = await Produce.findOne({ name: produceName, branch });

// Validate stock
if (produce.stock < tonnage) {
  return res.status(400).json({ 
    error: `Insufficient stock. Available: ${produce.stock}` 
  });
}

// Calculate amount using manager-set price
const calculatedAmount = produce.salePrice * tonnage;

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

// Reduce stock atomically
produce.stock -= tonnage;
produce.updatedAt = new Date();

// Save both records
await sale.save();
await produce.save();
```

### 3. Role-Based Dashboard (dashboard.html)
```javascript
// Get user role from localStorage
const role = localStorage.getItem('role').toLowerCase();

// Filter navigation based on role
navButtons.forEach(btn => {
  const allowed = btn.dataset.roles.split(',').includes(role);
  btn.hidden = !allowed;
  
  if (btn.tagName === 'A') {
    btn.style.display = allowed ? 'block' : 'none';
  }
});

// Hide action buttons for directors
if (role === 'director') {
  document.querySelectorAll('[data-role-link]').forEach(el => {
    const allowedRoles = el.dataset.roleLink.split(',');
    if (!allowedRoles.includes('director')) {
      el.style.display = 'none';
    }
  });
}
```

### 4. Credit Payment Status Update
```javascript
// Update status endpoint
router.put('/:id/status', verifyToken, async (req, res) => {
  const { status } = req.body;
  
  // Validate status
  if (!['pending', 'paid', 'overdue'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Update credit sale
  const creditSale = await CreditSale.findByIdAndUpdate(
    req.params.id,
    { status, updatedAt: new Date() },
    { new: true }
  );
  
  res.json({ message: `Credit sale marked as ${status}`, creditSale });
});
```

### 5. Receipt Generation
```javascript
function printReceipt(sale) {
  const receiptWindow = window.open('', '_blank', 'width=400,height=600');
  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${sale.buyerName}</title>
      <style>
        body { font-family: monospace; padding: 20px; }
        .line { border-top: 2px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; }
        .total { font-weight: bold; font-size: 1.2em; }
      </style>
    </head>
    <body>
      <h2>KGL RECEIPT</h2>
      <div class="line"></div>
      <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
      <div class="row"><span>Branch:</span><span>${sale.branch}</span></div>
      <div class="line"></div>
      <div class="row"><span>Buyer:</span><span>${sale.buyerName}</span></div>
      <div class="row"><span>Product:</span><span>${sale.produceName}</span></div>
      <div class="row"><span>Quantity:</span><span>${sale.tonnage} units</span></div>
      <div class="line"></div>
      <div class="row total"><span>TOTAL:</span><span>UGX ${sale.amount}</span></div>
      <button onclick="window.print()">Print Receipt</button>
    </body>
    </html>
  `);
}
```

---

## Presentation Highlights

### System Strengths
1. **Role-Based Security** - Four distinct user roles with granular permissions
2. **Multi-Branch Support** - Matugga and Maganjo branches with centralized management
3. **Real-Time Inventory** - Automatic stock reduction and alerts
4. **Credit Management** - Complete credit sales lifecycle tracking
5. **Manager Control** - Full cross-branch management capabilities
6. **Director Oversight** - Comprehensive view-only access for strategic decisions
7. **Receipt Printing** - Professional receipts for all transactions
8. **Responsive Design** - Works on desktop, tablet, and mobile devices

### Technical Achievements
- JWT-based authentication
- MongoDB with Mongoose ODM
- RESTful API architecture
- Input validation and sanitization
- Atomic database operations
- Role-based UI rendering
- Print-friendly interfaces

### Business Value
- Reduces inventory discrepancies
- Tracks credit sales effectively
- Provides real-time business insights
- Enables data-driven decisions
- Improves operational efficiency
- Maintains audit trail
- Supports multi-location operations

---

**End of Documentation**

*Generated for KGL Application Presentation*

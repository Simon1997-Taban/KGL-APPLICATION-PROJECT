/**
 * Credit Sale Schema & Model
 * 
 * Author: Simon Lodongo Taban
 * Email: simonlodongotaban@gmail.com | simonلodongotaban@yahoo.com
 * Phone: +256 789121378 | +256 788858064
 * 
 * Description: Defines the CreditSale collection in MongoDB.
 * Records deferred payment transactions (credit sales to trusted buyers).
 * Completely separate from regular sales to maintain clear financial tracking.
 * When a credit sale is recorded, stock is automatically reduced in Produce collection.
 * 
 * Key Features:
 * - Separate collection from regular sales
 * - Tracks buyer identity (NIN, location, contact)
 * - Due date tracking for payment follow-up
 * - Status tracking (pending, paid, overdue)
 * - Automatic stock reduction on recording
 * - Alerts for overdue payments
 * - Database indexes for efficient reporting
 */

const mongoose = require('mongoose');

/**
 * Credit Sale Schema Definition
 * 
 * Represents a deferred payment sales transaction.
 * Stock is decremented automatically when credit sale is recorded.
 * Single collection entry can represent multiple produce items of same type.
 * 
 * Fields:
 * - buyerName: Full name of buyer
 * - nin: National ID or identification number (for credit verification)
 * - location: Buyer's delivery address
 * - contact: Buyer's phone number
 * - amountDue: Total amount buyer owes
 * - produce: Reference to Produce item (ObjectId)
 * - produceName: Denormalized produce name
 * - tonnage: Quantity delivered on credit
 * - salesAgent: Reference to User who recorded sale
 * - dueDate: When payment is expected
 * - dispatchDate: When produce was delivered
 * - branch: Which branch made the credit sale
 * - status: Current payment status (pending/paid/overdue)
 * - timestamps: Automatic audit trail
 */
const creditSaleSchema = new mongoose.Schema({
  // Full name of buyer (for credit verification and communication)
  buyerName: {
    type: String,
    required: [true, 'Buyer name is required'],
    minlength: [2, 'Buyer name must be at least 2 characters']
  },

  // National ID or identification number
  // Used for credit verification and buyer identification
  nin: {
    type: String,
    required: [true, 'NIN (National ID) is required'],
    minlength: [6, 'NIN must be at least 6 characters']
  },

  // Buyer email for follow-up and invoicing
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Email must be valid']
  },

  // Buyer nationality for KYC / reporting
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    minlength: [2, 'Nationality must be at least 2 characters']
  },

  // Buyer's delivery/billing address
  location: {
    type: String,
    required: [true, 'Location is required'],
    minlength: [3, 'Location must be at least 3 characters']
  },

  // Buyer's contact phone number
  contact: {
    type: String,
    required: [true, 'Contact is required'],
    match: [/^[0-9]{10,15}$/, 'Contact must be a valid phone number (10-15 digits)']
  },

  // Total amount buyer owes
  // Core field for financial tracking and follow-up
  amountDue: {
    type: Number,
    required: [true, 'Amount due is required'],
    min: [0.01, 'Amount must be greater than 0']
  },

  // Reference to the Produce item being sold on credit
  // Used to access sales price and other details
  produce: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produce',
    required: [true, 'Produce reference is required']
  },

  // Produce name - denormalized for quick access
  // Maintained in case produce record is deleted
  produceName: {
    type: String,
    required: [true, 'Produce name is required']
  },

  // Quantity delivered in tonnes
  // Stock in Produce is decremented by this amount
  tonnage: {
    type: Number,
    required: [true, 'Tonnage is required'],
    min: [0.01, 'Tonnage must be greater than 0']
  },

  // Reference to User who recorded this credit sale
  // Used for agent accountability and performance tracking
  salesAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sales agent is required']
  },

  // Agent name - denormalized for reports
  // Maintains history even if agent is deleted
  salesAgentName: {
    type: String,
    required: [true, 'Sales agent name is required']
  },

  // Expected payment date
  // Used to identify overdue payments
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },

  // When produce was actually delivered to buyer
  // May differ from order date
  dispatchDate: {
    type: Date,
    default: Date.now
  },

  // Branch that made this credit sale
  // Used for branch-level credit analysis
  branch: {
    type: String,
    enum: ['branch1', 'branch2'],
    required: [true, 'Branch is required']
  },

  // Current payment status
  // pending: Not yet paid, within due date
  // paid: Payment received in full
  // overdue: Past due date, payment outstanding
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },

  // Automatic timestamp of when credit sale was recorded
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Automatic timestamp of last status/amount change
  // Used for audit trail
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create database indexes for fast query performance
// Index for filtering by branch and status, sorted by date
// Used for: "get all pending payments in branch1"
creditSaleSchema.index({ branch: 1, status: 1, createdAt: -1 });

// Index for agent credit sales history
// Used for: "get all credit sales by agent X"
creditSaleSchema.index({ salesAgent: 1, createdAt: -1 });

// Index for finding overdue payments
// Used for: "find all sales with dueDate in past"
creditSaleSchema.index({ dueDate: 1 });

// Export compiled CreditSale model for use in routes
module.exports = mongoose.model('CreditSale', creditSaleSchema);

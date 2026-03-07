/**
 * Add Sample Sales Data
 * This script creates sample sales records to populate the Activity Log
 */

const mongoose = require('mongoose');
const Sale = require('./models/Sale');
const Produce = require('./models/Produce');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kgl';

async function addSampleSales() {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // Get a sample user or director to attribute sales to
    let user = await User.findOne({ role: 'director' });
    
    if (!user) {
      // Create a sample director if none exists
      user = await User.create({
        name: 'System Director',
        email: 'director@kgl.com',
        password: 'password123',
        role: 'director',
        branch: 'branch1'
      });
      console.log('✅ Created sample director user');
    }

    // Get or create sample produce items
    let produce1 = await Produce.findOne({ name: 'Maize' });
    if (!produce1) {
      produce1 = await Produce.create({
        name: 'Maize',
        type: 'Yellow Corn',
        stock: 500,
        cost: 80,
        dealerName: 'Farmer Smith Supplies',
        branch: 'branch1',
        contact: '0712345678',
        salePrice: 100,
        recordedBy: user._id
      });
      console.log('✅ Created Maize produce item');
    }

    let produce2 = await Produce.findOne({ name: 'Rice' });
    if (!produce2) {
      produce2 = await Produce.create({
        name: 'Rice',
        type: 'White Rice',
        stock: 300,
        cost: 120,
        dealerName: 'Farm Associates',
        branch: 'branch2',
        contact: '0798765432',
        salePrice: 150,
        recordedBy: user._id
      });
      console.log('✅ Created Rice produce item');
    }

    // Create sample sales data
    const sampleSales = [
      {
        produce: produce1._id,
        produceName: 'Maize',
        tonnage: 50,
        amountPaid: 5000,
        buyerName: 'John Doe Traders',
        salesAgent: user._id,
        salesAgentName: user.name,
        branch: 'branch1',
        saleType: 'regular'
      },
      {
        produce: produce2._id,
        produceName: 'Rice',
        tonnage: 75,
        amountPaid: 11250,
        buyerName: 'Quality Foods Ltd',
        salesAgent: user._id,
        salesAgentName: user.name,
        branch: 'branch2',
        saleType: 'regular'
      },
      {
        produce: produce1._id,
        produceName: 'Maize',
        tonnage: 30,
        amountPaid: 3000,
        buyerName: 'Local Market',
        salesAgent: user._id,
        salesAgentName: user.name,
        branch: 'branch1',
        saleType: 'regular'
      },
      {
        produce: produce2._id,
        produceName: 'Rice',
        tonnage: 45,
        amountPaid: 6750,
        buyerName: 'Restaurant Chain',
        salesAgent: user._id,
        salesAgentName: user.name,
        branch: 'branch2',
        saleType: 'regular'
      }
    ];

    // Insert sample sales
    const insertedSales = await Sale.insertMany(sampleSales);
    console.log(`✅ Created ${insertedSales.length} sample sales records`);

    // Display created sales
    console.log('\n📊 Sample Sales Created:');
    insertedSales.forEach((sale, index) => {
      console.log(`  ${index + 1}. ${sale.produceName} - ${sale.tonnage} tonnes - UGX${sale.amountPaid} (${sale.branch}) - ${sale.buyerName}`);
    });

    console.log('\n✅ Sample data added successfully!');
    console.log('📝 Activity Log should now show sales records in the Director Dashboard');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample sales:', error.message);
    process.exit(1);
  }
}

addSampleSales();

addSampleSales();

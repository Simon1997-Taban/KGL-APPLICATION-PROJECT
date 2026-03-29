require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Produce = require('./models/Produce');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas');

  // Clear existing data
  await User.deleteMany({});
  await Produce.deleteMany({});

  const salt = await bcrypt.genSalt(10);

  const users = await User.insertMany([
    {
      name: 'Florence Sislian',
      email: 'florencesisilia@yahoo.com',
      password: await bcrypt.hash('Florence@2001', salt),
      role: 'director',
      branch: 'branch1',
      contact: '0700000001'
    },
    {
      name: 'Simon Lodongo Taban',
      email: 'simonlodongotaban@yahoo.com',
      password: await bcrypt.hash('Simon@1997', salt),
      role: 'manager',
      branch: 'branch1',
      contact: '0789121378'
    }
  ]);

  const manager = users[1]._id;

  await Produce.insertMany([
    { name: 'Maize', type: 'Yellow Corn', stock: 50, cost: 800000, salePrice: 950000, dealerName: 'Kampala Grains Ltd', branch: 'branch1', contact: '0701234567', recordedBy: manager },
    { name: 'Maize', type: 'White Corn', stock: 40, cost: 780000, salePrice: 920000, dealerName: 'Kampala Grains Ltd', branch: 'branch2', contact: '0701234567', recordedBy: manager },
    { name: 'Beans', type: 'K132 Beans', stock: 30, cost: 1200000, salePrice: 1450000, dealerName: 'Uganda Legumes Co', branch: 'branch1', contact: '0712345678', recordedBy: manager },
    { name: 'Beans', type: 'Nambale Beans', stock: 25, cost: 1150000, salePrice: 1400000, dealerName: 'Uganda Legumes Co', branch: 'branch2', contact: '0712345678', recordedBy: manager },
    { name: 'Peas', type: 'Green Peas', stock: 20, cost: 1500000, salePrice: 1800000, dealerName: 'Agro Supplies Uganda', branch: 'branch1', contact: '0723456789', recordedBy: manager },
    { name: 'Peas', type: 'Yellow Peas', stock: 18, cost: 1450000, salePrice: 1750000, dealerName: 'Agro Supplies Uganda', branch: 'branch2', contact: '0723456789', recordedBy: manager },
    { name: 'Soya Beans', type: 'Grade A Soya', stock: 35, cost: 1300000, salePrice: 1600000, dealerName: 'East Africa Soya Ltd', branch: 'branch1', contact: '0734567890', recordedBy: manager },
    { name: 'Soya Beans', type: 'Grade B Soya', stock: 28, cost: 1250000, salePrice: 1550000, dealerName: 'East Africa Soya Ltd', branch: 'branch2', contact: '0734567890', recordedBy: manager },
    { name: 'Cassava Flour', type: 'Fine Cassava', stock: 60, cost: 600000, salePrice: 750000, dealerName: 'Western Uganda Millers', branch: 'branch1', contact: '0745678901', recordedBy: manager },
    { name: 'Cassava Flour', type: 'Coarse Cassava', stock: 55, cost: 580000, salePrice: 720000, dealerName: 'Western Uganda Millers', branch: 'branch2', contact: '0745678901', recordedBy: manager }
  ]);

  console.log('Seeded 2 users and 10 produce items to Atlas');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });

/**
 * Database Diagnostic Tool
 * Checks if you're logged in and if your user exists in MongoDB
 * Author: Simon Lodongo Taban
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Get token from command line or use test
const token = process.argv[2] || null;

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { ...headers }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function diagnose() {
  console.log('\n🔍 KGL DATABASE DIAGNOSTIC TOOL\n');
  console.log('=' .repeat(60));

  try {
    if (!token) {
      console.log('\n❌ NO TOKEN PROVIDED');
      console.log('\nYou need to be logged in. Do this:');
      console.log('1. Open browser: http://localhost:3000/login');
      console.log('2. Login with your credentials');
      console.log('3. Open browser DevTools (F12)');
      console.log('4. Go to Application > LocalStorage > http://localhost:3000');
      console.log('5. Copy the "token" value');
      console.log('6. Run: node diagnose-db.js YOUR_TOKEN_HERE');
      process.exit(1);
    }

    // Extract userId from token
    let userId = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        userId = decoded.userId;
        console.log('\n✅ TOKEN DECODED SUCCESSFULLY');
        console.log('   User ID in token:', userId);
      }
    } catch (e) {
      console.log('❌ Could not decode token');
      process.exit(1);
    }

    // Test 1: Try to fetch user profile
    console.log('\n📝 TEST 1: Checking if user exists');
    console.log('-'.repeat(60));
    
    const profileRes = await makeRequest('GET', `/api/auth/profile/${userId}`, {
      'Authorization': `Bearer ${token}`
    });

    if (profileRes.status === 200) {
      console.log('✅ USER FOUND IN DATABASE');
      console.log('   Name:', profileRes.data.name);
      console.log('   Email:', profileRes.data.email);
      console.log('   Role:', profileRes.data.role);
      console.log('   Branch:', profileRes.data.branch);
      console.log('   Contact:', profileRes.data.contact);
    } else if (profileRes.status === 404) {
      console.log('❌ USER NOT FOUND IN DATABASE');
      console.log('   Error:', profileRes.data.error);
      console.log('\n   SOLUTION: You need to register again');
      console.log('   1. Go to: http://localhost:3000/register');
      console.log('   2. Fill in ALL fields');
      console.log('   3. Click Register');
      console.log('   4. Get new token from localStorage');
      process.exit(1);
    } else {
      console.log('⚠️  UNEXPECTED ERROR');
      console.log('   Status:', profileRes.status);
      console.log('   Error:', profileRes.data.error);
      process.exit(1);
    }

    // Test 2: Try a procurement operation
    console.log('\n📝 TEST 2: Testing procurement operation');
    console.log('-'.repeat(60));

    const procRes = await makeRequest('GET', '/api/procurement', {
      'Authorization': `Bearer ${token}`
    });

    if (procRes.status === 200) {
      console.log('✅ PROCUREMENT OPERATION WORKS');
      console.log('   Records in database:', Array.isArray(procRes.data) ? procRes.data.length : '0');
    } else {
      console.log('❌ PROCUREMENT OPERATION FAILED');
      console.log('   Status:', procRes.status);
      console.log('   Error:', procRes.data.error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNOSTICS COMPLETE');
    console.log('\nNext steps:');
    console.log('1. Your user exists: Try recording procurement again');
    console.log('2. Make sure ALL form fields are filled');
    console.log('3. Check the browser console (F12) for errors');
    console.log('4. Try the automated test: node test-system.js\n');

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is server running? node server.js');
    console.log('2. Is MongoDB running?');
    console.log('3. Have you logged in? Go to /login first\n');
    process.exit(1);
  }
}

diagnose();

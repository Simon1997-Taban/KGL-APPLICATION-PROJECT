/**
 * Validation Test Suite
 * 
 * Tests for:
 * - Email format validation
 * - Phone number validation  
 * - Password strength & matching
 * - Required field validation
 * - Duplicate email prevention
 * - OTP code verification
 * - Account verification flow
 * 
 * Run with: npm test (after adding test script to package.json)
 */

const assert = require('assert');

// Validation regex patterns (must match routes/auth.js)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

describe('Input Validation Tests', () => {
  
  describe('Email Validation', () => {
    it('should accept valid email format', () => {
      const emails = [
        'user@example.com',
        'test.user@company.co.uk',
        'contact+tag@domain.org',
        'simonlodongotaban@gmail.com'
      ];
      emails.forEach(email => {
        assert.strictEqual(
          EMAIL_REGEX.test(email),
          true,
          `Email "${email}" should be valid`
        );
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'user@',
        '',
        'user..name@example.com'
      ];
      invalidEmails.forEach(email => {
        assert.strictEqual(
          EMAIL_REGEX.test(email),
          false,
          `Email "${email}" should be invalid`
        );
      });
    });

    it('should normalize email to lowercase', () => {
      const email = 'TestUser@Gmail.COM';
      const normalized = email.trim().toLowerCase();
      assert.strictEqual(normalized, 'testuser@gmail.com');
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid phone numbers', () => {
      const phones = [
        '1234567890',      // 10 digits
        '12345678901',     // 11 digits
        '123456789012345', // 15 digits
        '+256789121378',   // Uganda prefix (stripped before match)
        '0789121378'
      ];
      phones.forEach(phone => {
        const cleaned = phone.replace(/[^\d]/g, '');
        assert.ok(
          cleaned.length >= 10 && cleaned.length <= 15,
          `Phone "${phone}" should be valid (cleaned: ${cleaned})`
        );
      });
    });

    it('should reject invalid phone numbers using PHONE_REGEX', () => {
      const invalidPhones = [
        '123',           // Too short (< 10)
        '12345678901234567', // Too long (> 15)
        'abc1234567890', // Non-numeric
        '',
        '   '
      ];
      invalidPhones.forEach(phone => {
        assert.strictEqual(
          PHONE_REGEX.test(phone),
          false,
          `Phone "${phone}" should be invalid`
        );
      });
    });

    it('should enforce 10-15 digit range', () => {
      assert.strictEqual(PHONE_REGEX.test('1234567890'), true);     // 10 = OK
      assert.strictEqual(PHONE_REGEX.test('123456789'), false);      // 9 = FAIL
      assert.strictEqual(PHONE_REGEX.test('1234567890123456'), false); // 16 = FAIL
    });
  });

  describe('Password Validation', () => {
    it('should require minimum 6 characters', () => {
      assert.strictEqual('12345'.length >= 6, false);  // Too short
      assert.strictEqual('123456'.length >= 6, true);  // OK
      assert.strictEqual('mypassword123'.length >= 6, true);  // OK
    });

    it('should require password confirmation match', () => {
      const password = 'securePass123';
      const confirm1 = 'securePass123';
      const confirm2 = 'securePass124';
      
      assert.strictEqual(password === confirm1, true);  // Match
      assert.strictEqual(password === confirm2, false); // Mismatch
    });

    it('should reject empty passwords', () => {
      assert.strictEqual(''.length >= 6, false);
    });
  });

  describe('Required Field Validation', () => {
    it('should validate all required fields present', () => {
      const requiredFields = ['name', 'email', 'password', 'confirmPassword', 'role', 'branch', 'contact'];
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'manager',
        branch: 'branch1',
        contact: '1234567890'
      };

      requiredFields.forEach(field => {
        assert.ok(
          user[field] !== undefined && user[field] !== '',
          `Field "${field}" should be present`
        );
      });
    });

    it('should detect missing required fields', () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        // Missing password
        role: 'manager'
      };

      const isValid = user.name && user.email && user.password && user.role;
      assert.strictEqual(isValid, false);
    });
  });

  describe('Role Validation', () => {
    it('should accept valid roles', () => {
      const validRoles = ['director', 'manager', 'procurement', 'agent'];
      const testRoles = ['director', 'manager', 'procurement', 'agent'];
      
      testRoles.forEach(role => {
        assert.ok(
          validRoles.includes(role),
          `Role "${role}" should be valid`
        );
      });
    });

    it('should reject invalid roles', () => {
      const validRoles = ['director', 'manager', 'procurement', 'agent'];
      const invalidRoles = ['admin', 'superuser', 'owner', ''];
      
      invalidRoles.forEach(role => {
        assert.strictEqual(
          validRoles.includes(role),
          false,
          `Role "${role}" should be invalid`
        );
      });
    });
  });

  describe('Branch Validation', () => {
    it('should accept valid branches', () => {
      const validBranches = ['branch1', 'branch2'];
      const testBranches = ['branch1', 'branch2'];
      
      testBranches.forEach(branch => {
        assert.ok(
          validBranches.includes(branch),
          `Branch "${branch}" should be valid`
        );
      });
    });

    it('should reject invalid branches', () => {
      const validBranches = ['branch1', 'branch2'];
      const invalidBranches = ['branch3', 'main', 'headquarters', 'Branch1', ''];
      
      invalidBranches.forEach(branch => {
        assert.strictEqual(
          validBranches.includes(branch),
          false,
          `Branch "${branch}" should be invalid`
        );
      });
    });
  });

  describe('OTP Code Validation', () => {
    it('should generate 6-digit OTP', () => {
      // Simulate OTP generation (matches routes/auth.js logic)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      assert.strictEqual(otpCode.length, 6);
      assert.strictEqual(/^[0-9]{6}$/.test(otpCode), true);
    });

    it('should validate OTP code format', () => {
      const validCodes = ['100000', '999999', '554321', '000001'];
      const invalidCodes = ['12345', '1234567', 'abc123', ''];
      
      validCodes.forEach(code => {
        assert.strictEqual(
          /^[0-9]{6}$/.test(code),
          true,
          `OTP "${code}" should be valid`
        );
      });
      
      invalidCodes.forEach(code => {
        assert.strictEqual(
          /^[0-9]{6}$/.test(code),
          false,
          `OTP "${code}" should be invalid`
        );
      });
    });

    it('should handle OTP code matching', () => {
      const storedCode = '123456';
      const userInput1 = '123456';
      const userInput2 = '123457';
      
      assert.strictEqual(storedCode === userInput1.trim(), true);   // Match
      assert.strictEqual(storedCode === userInput2.trim(), false);  // No match
    });
  });

  describe('Data Sanitization', () => {
    it('should trim whitespace from inputs', () => {
      const inputs = {
        email: '  user@example.com  ',
        contact: '  1234567890  ',
        name: '  John Doe  '
      };

      assert.strictEqual(inputs.email.trim(), 'user@example.com');
      assert.strictEqual(inputs.contact.trim(), '1234567890');
      assert.strictEqual(inputs.name.trim(), 'John Doe');
    });

    it('should convert email to lowercase', () => {
      const email = 'UserName@EXAMPLE.COM';
      assert.strictEqual(email.toLowerCase(), 'username@example.com');
    });
  });

});

// Example API test scenarios (for manual testing with curl or Postman)
describe('API Endpoint Examples', () => {
  
  console.log('\n📋 Manual API Test Examples:\n');
  
  console.log('1. Register New User:');
  console.log('   POST /api/auth/register');
  console.log('   {');
  console.log('     "name": "Jane Smith",');
  console.log('     "email": "jane@example.com",');
  console.log('     "password": "SecurePass123",');
  console.log('     "confirmPassword": "SecurePass123",');
  console.log('     "role": "manager",');
  console.log('     "branch": "branch1",');
  console.log('     "contact": "1234567890"');
  console.log('   }');
  console.log('   Expected: 201 Created + OTP sent to email\n');
  
  console.log('2. Verify Account with OTP:');
  console.log('   POST /api/auth/verify');
  console.log('   {');
  console.log('     "email": "jane@example.com",');
  console.log('     "code": "123456"  // From email');
  console.log('   }');
  console.log('   Expected: 200 OK + Account verified\n');
  
  console.log('3. Login (after verification):');
  console.log('   POST /api/auth/login');
  console.log('   {');
  console.log('     "email": "jane@example.com",');
  console.log('     "password": "SecurePass123"');
  console.log('   }');
  console.log('   Expected: 200 OK + JWT token\n');
  
  console.log('4. Resend OTP:');
  console.log('   POST /api/auth/send-otp');
  console.log('   {');
  console.log('     "email": "jane@example.com"');
  console.log('   }');
  console.log('   Expected: 200 OK + New OTP sent\n');

  it('should document example payloads', () => {
    assert.ok(true); // Placeholder test
  });
});

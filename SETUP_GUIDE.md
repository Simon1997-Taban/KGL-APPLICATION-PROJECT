# KGL Application - Setup & Verification Guide

## 📋 Prerequisites

Before running the application, ensure you have installed all dependencies:

```bash
npm install
```

## ⚙️ Environment Configuration

The `.env` file has been pre-configured with:

- **MongoDB**: Cloud database connection (Atlas)
- **JWT Secret**: Secure token signing key
- **Email (Gmail SMTP)**: Pre-configured for OTP delivery
- **OTP Settings**: 10-minute expiration

### Email Configuration Details

The application uses **Gmail SMTP** to send OTP verification codes. The configuration includes:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=simonlodongotaban@gmail.com
SMTP_PASSWORD=ebkd vsop vfgq dcxa
EMAIL_FROM=simonlodongotaban@gmail.com
EMAIL_FROM_NAME=KGL Agricultural Management
```

⚠️ **Important**: Gmail App Passwords are used instead of regular password. The credentials are pre-configured and ready to use.

---

## 🚀 Running the Application

### Start the Server

```bash
npm start
```

Server will run on `http://localhost:3000`

### Running Tests

```bash
npm test
```

This runs all validation tests to ensure input validation is working correctly.

---

## 🔐 User Registration & Verification Flow

### Step 1: Register New Account

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "manager",
  "branch": "branch1",
  "contact": "1234567890"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "manager",
  "userId": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "verificationCode": "123456"
}
```

**What happens**:
- User account is created with `isVerified: false`
- 6-digit OTP is generated and sent to email
- Response includes verification code (for testing; hidden in production)

### Step 2: Verify Email with OTP

**Endpoint**: `POST /api/auth/verify`

**Request Body**:
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Response** (200 OK):
```json
{
  "message": "Account verified successfully"
}
```

**What happens**:
- OTP code is validated
- Account is marked as `isVerified: true`
- Verification success email is sent
- User can now log in

### Step 3: Login (After Verification)

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "manager",
  "userId": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "branch": "branch1",
  "contact": "1234567890"
}
```

**What fails**:
- Login will return `403 Forbidden` if account is not verified
- Password mismatch returns `401 Unauthorized`
- Non-existent email returns `401 Unauthorized`

### Step 4: Resend OTP (if needed)

**Endpoint**: `POST /api/auth/send-otp`

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200 OK):
```json
{
  "message": "OTP sent successfully to your email",
  "email": "john@example.com",
  "verificationCode": "654321"
}
```

**Use cases**:
- User didn't receive original email
- OTP code expired (10 minutes)
- User requesting new code

---

## 🛡️ Input Validation Rules

### Email Validation
- Must be valid email format: `user@example.com`
- Automatically converted to lowercase
- Unique in database (no duplicates)

**Valid Examples**:
- `john@example.com`
- `test.user@company.co.uk`
- `contact+tag@domain.org`

**Invalid Examples**:
- `notanemail`
- `missing@domain`
- `user@` (incomplete)

### Phone Number (Contact) Validation
- Must be 10-15 digits (numeric only)
- Automatically stripped of special characters
- Required field

**Valid Examples**:
- `1234567890`
- `12345678901234567` (15 digits)
- `0788858064` (Uganda format after stripping)

**Invalid Examples**:
- `123` (too short)
- `12345678901234567` (16 digits, too long)
- `abc1234567890` (contains letters)

### Password Validation
- Minimum 6 characters required
- Must match `confirmPassword` field
- Stored as bcrypt hash in database

**Valid Examples**:
- `SecurePass123`
- `MyPassword@2024`
- `password123abc`

**Invalid Examples**:
- `pass` (too short)
- `password123` vs `password124` (mismatch)
- Empty string

### Role Validation
- Must be one of: `director`, `manager`, `procurement`, `agent`
- Case-sensitive

### Branch Validation
- Must be one of: `branch1`, `branch2`
- Case-sensitive
- Required for all users

---

## 📧 Email Templates

### OTP Verification Email
Sent immediately after registration with:
- User's name personalization
- 6-digit OTP code highlighted
- Security warning about code expiry (10 minutes)
- Instructions to not share code

### Verification Success Email
Sent after successful verification with:
- Confirmation message
- Account status (Active)
- Next steps information
- Support contact details

---

## 🔍 Testing the Workflow

### Using Postman

1. **Register User**:
   - Method: POST
   - URL: `http://localhost:3000/api/auth/register`
   - Body (JSON): Use example from Step 1
   - Copy the `verificationCode` from response

2. **Verify Account**:
   - Method: POST
   - URL: `http://localhost:3000/api/auth/verify`
   - Body: `{"email": "john@example.com", "code": "123456"}`

3. **Login**:
   - Method: POST
   - URL: `http://localhost:3000/api/auth/login`
   - Body: `{"email": "john@example.com", "password": "SecurePass123"}`

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "role": "manager",
    "branch": "branch1",
    "contact": "1234567890"
  }'

# Verify (use code from email)
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "code": "123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "SecurePass123"}'
```

---

## 🚨 Troubleshooting

### Email Not Received

1. **Check .env configuration**:
   ```bash
   # Verify these variables are set
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=simonlodongotaban@gmail.com
   SMTP_PASSWORD=ebkd vsop vfgq dcxa
   ```

2. **Check server logs**: Look for "OTP email sent successfully" message

3. **Use Resend OTP endpoint**: `POST /api/auth/send-otp`

4. **Check spam folder**: Gmail may filter automated emails

### Login Still Blocked

1. **Verify account status**: Check `isVerified` field in database
2. **Use correct email**: Email must match exactly
3. **Check response error message**: Will indicate if account needs verification

### OTP Code Invalid

1. **Check code hasn't expired**: OTP valid for 10 minutes
2. **Request new code**: Use `/api/auth/send-otp` endpoint
3. **Verify exact match**: Code must match exactly (no spaces)

### Database Connection Error

1. **Check MongoDB URI**: Ensure .env has correct connection string
2. **Check internet**: MongoDB Atlas requires network access
3. **Verify credentials**: Username/password in connection string

---

## 📊 Database Schema

### User Model

```javascript
{
  name: String (required, min 3 chars),
  email: String (required, unique, lowercase),
  password: String (required, bcrypt hashed),
  role: String (enum: director, manager, procurement, agent),
  branch: String (enum: branch1, branch2),
  contact: String (required, 10-15 digits),
  photo: String (optional, upload path),
  isVerified: Boolean (default: false),
  verificationCode: String (6-digit OTP, null after verification),
  createdAt: Date (automatic),
  updatedAt: Date (automatic)
}
```

---

## 🔒 Security Features Implemented

1. **Email Verification**: Required before login
2. **Password Hashing**: bcryptjs with 10 salt rounds
3. **Rate Limiting**: Max 30 auth requests per minute per IP
4. **Input Validation**: Strict format and type checking
5. **JWT Tokens**: Secure session tokens (7-day expiration)
6. **Duplicate Prevention**: Unique email constraint in database
7. **SQL/NoSQL Injection**: Parameterized queries via Mongoose

---

## 📝 Running the Test Suite

```bash
npm test
```

Tests cover:
- Email format validation
- Phone number validation
- Password strength and matching
- Required field validation
- Role options validation
- Branch options validation
- OTP code generation and matching
- Data sanitization

---

## 🎯 Next Steps

1. ✅ Environment configured with email
2. ✅ OTP verification flow implemented
3. ✅ Input validation tests created
4. ✅ Rate limiting added
5. 📋 **Recommended**: Update register.html UI to show verification prompt
6. 📋 **Recommended**: Add SMS OTP option (Twilio integration)
7. 📋 **Recommended**: Implement password reset flow

---

## 💡 Tips

- **Testing**: Use the `verificationCode` in registration response for quick testing
- **Production**: Hide `verificationCode` in registration response before deploying
- **Scale**: Use Redis for rate limiting when scaling beyond single server
- **Security**: Rotate JWT_SECRET and email credentials periodically

---

Last updated: March 29, 2026

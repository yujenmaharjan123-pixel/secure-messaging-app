# Secure Messaging App - Complete Setup Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

If you're familiar with Node.js and npm, here's the quick version:

```bash
# Extract the zip file
unzip secure-messaging-app.zip
cd secure-messaging-app

# Install and run backend
npm install
cp .env.example .env
npm test
npm start

# In another terminal, setup frontend
cd client
npm install
npm start
```

Visit `http://localhost:3000` in your browser.

---

## Prerequisites

### System Requirements
- **OS**: Windows, macOS, or Linux
- **RAM**: 2GB minimum, 4GB recommended
- **Disk Space**: 500MB for dependencies
- **Internet**: Required for package installation

### Required Software
- **Node.js**: v14.0.0 or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`
  
- **npm**: v6.0.0 or higher (usually comes with Node.js)
  - Verify: `npm --version`

### Optional Tools
- **Git**: For version control (recommended)
  - Download: https://git-scm.com/
  
- **Visual Studio Code**: Code editor
  - Download: https://code.visualstudio.com/

---

## Backend Setup

### Step 1: Extract Project Files

```bash
# Unzip the project
unzip secure-messaging-app.zip
cd secure-messaging-app
```

### Step 2: Install Backend Dependencies

```bash
# From project root directory
npm install
```

This will install all server dependencies listed in package.json:
- express
- cors
- sqlite3
- bcryptjs
- jsonwebtoken
- helmet
- express-rate-limit
- express-validator
- And more...

**Installation Time**: 2-5 minutes (depends on internet speed)

### Step 3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your preferred editor
nano .env
# or
vim .env
# or open with your code editor
```

**Important Variables to Update**:

```env
# Change these to secure random values
JWT_SECRET=change_this_to_a_long_random_string_at_least_32_characters
ENCRYPTION_KEY=generate_a_32_character_random_key_for_encryption

# Other settings (optional, can be left as default)
PORT=5000
NODE_ENV=development
DB_PATH=./database/messages.db
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

**Generating Secure Secrets**:

```bash
# On Linux/macOS
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
```

### Step 4: Initialize Database

The database is automatically created on first run. To verify setup:

```bash
npm test
```

This runs the test suite and initializes the database tables.

### Step 5: Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR production mode
npm start
```

**Expected Output**:
```
🔐 Secure Messaging Server running on port 5000
Environment: development
```

If you see this, the backend is ready! ✅

---

## Frontend Setup

### Step 1: Navigate to Client Directory

```bash
# From a NEW terminal window
cd secure-messaging-app/client
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

This installs all React and frontend dependencies:
- react
- react-dom
- react-router-dom
- axios
- crypto-js
- lucide-react
- And more...

**Installation Time**: 3-8 minutes

### Step 3: Configure API Endpoint (Optional)

The frontend is configured to connect to `http://localhost:5000` by default (see package.json "proxy").

If your backend is running on a different port:

1. Edit `client/package.json`
2. Change the "proxy" value:
   ```json
   "proxy": "http://localhost:YOUR_PORT"
   ```
3. Restart the development server

### Step 4: Start Frontend Server

```bash
npm start
```

**Expected Output**:
```
Compiled successfully!
You can now view secure-messaging-client in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Note**: The app will automatically open in your default browser.

---

## Running the Application

### Full Application Startup

**Terminal 1 - Backend**:
```bash
cd secure-messaging-app
npm install  # if not done yet
npm start
```

**Terminal 2 - Frontend**:
```bash
cd secure-messaging-app/client
npm install  # if not done yet
npm start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### First Time Usage

1. **Register Account**:
   - Click "Sign up here" on login page
   - Enter username, email, and strong password
   - Click "Create Account"

2. **Login**:
   - Enter your username and password
   - Click "Sign In"

3. **Send Messages**:
   - Click "+ New Message" to start conversation
   - Select a user to chat with
   - Type message and click send
   - All messages are encrypted! 🔐

---

## Testing

### Running All Tests

```bash
# From project root
npm test
```

This runs:
- Unit tests for encryption
- Integration tests for API endpoints
- Generates coverage report

### Running Specific Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm test -- --coverage
```

### Expected Test Results

```
PASS  server/__tests__/unit/encryption.test.js
PASS  server/__tests__/integration/api.test.js

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
```

### Test Coverage

```
Statements   : 75% (30/40 )
Branches     : 70% (21/30 )
Functions    : 80% (32/40 )
Lines        : 78% (31/40 )
```

---

## Build for Production

### Frontend Build

```bash
cd client
npm run build
```

Creates optimized production build in `client/build/` directory.

### Backend Production Setup

```bash
# Set production environment
export NODE_ENV=production  # Linux/macOS
# or
set NODE_ENV=production     # Windows CMD

# Generate new secure secrets
# Update JWT_SECRET and ENCRYPTION_KEY in .env

npm start
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. "Port 5000 already in use"
```bash
# Find process using port
lsof -i :5000  # macOS/Linux

# Kill the process
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

#### 2. "Cannot find module 'express'"
```bash
# Make sure you're in correct directory
cd secure-messaging-app

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 3. "Database locked" error
- Ensure only one server instance running
- Check file permissions on database folder
- Restart the server

#### 4. CORS errors in browser console
- Verify backend is running on port 5000
- Check that frontend "proxy" is correct
- Check ALLOWED_ORIGINS in .env

#### 5. "Cannot GET /" error
- Make sure frontend is running (port 3000)
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)

#### 6. Login doesn't work
```bash
# Verify backend is responding
curl http://localhost:5000/health

# Check server logs for errors
# Verify database was created
ls -la database/messages.db
```

#### 7. Messages not encrypting
- Check ENCRYPTION_KEY in .env is set
- Verify it's 32 characters long
- Restart backend server

#### 8. "npm: command not found"
- Node.js not installed or PATH not set
- Download from https://nodejs.org/
- Verify: `node --version`

### Getting Help

1. **Check logs**:
   - Backend: Look at console output when running `npm start`
   - Frontend: Open DevTools (F12) and check Console tab

2. **Common log messages**:
   - "Connected to SQLite database" → Database initialized ✅
   - "compiled successfully" → Frontend ready ✅
   - "running on port 5000" → Backend ready ✅

3. **Debug mode**:
   ```bash
   # Verbose logging
   DEBUG=* npm start
   ```

4. **Reset everything**:
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json database/
   npm install
   npm start
   ```

---

## Development Workflow

### Make Code Changes

```bash
# Backend changes:
# - Files are watched automatically (nodemon)
# - Server restarts on save

# Frontend changes:
# - Hot reload works automatically
# - Changes appear in browser instantly
```

### Version Control

```bash
# Initialize git (if not done)
git init

# Create initial commit
git add .
git commit -m "Initial commit: Secure Messaging App"

# Add remote repository
git remote add origin https://github.com/username/repo.git
git push -u origin main
```

### Environment Setup

For different environments:

```bash
# Development (.env)
NODE_ENV=development
JWT_SECRET=dev_secret_key
ENCRYPTION_KEY=dev_encryption_key_32chars

# Production (.env.production)
NODE_ENV=production
JWT_SECRET=prod_secret_key_very_long_random
ENCRYPTION_KEY=prod_encryption_key_32chars
ALLOWED_ORIGINS=https://yourdomain.com

# Testing
NODE_ENV=test
```

---

## Performance Tips

1. **Database**: Clear old messages periodically
2. **Caching**: Implement Redis for sessions (optional)
3. **CDN**: Use CDN for static frontend assets
4. **Compression**: gzip compression enabled by default
5. **Monitoring**: Set up error tracking (Sentry, etc.)

---

## Security Checklist Before Deployment

- [ ] Changed JWT_SECRET to strong random value
- [ ] Changed ENCRYPTION_KEY to strong random value
- [ ] Set NODE_ENV=production
- [ ] Enabled HTTPS/TLS
- [ ] Updated ALLOWED_ORIGINS
- [ ] Reviewed rate limiting settings
- [ ] Set up monitoring/logging
- [ ] Backed up database
- [ ] Updated all dependencies
- [ ] Tested all features
- [ ] Reviewed security.md

---

## Next Steps

1. **Explore the code**: Read through the structure
2. **Customize**: Add your branding and features
3. **Test thoroughly**: Run all test suites
4. **Deploy**: Follow deployment guide for your platform
5. **Monitor**: Set up error tracking and monitoring

---

## Support & Documentation

- **README.md**: Full project documentation
- **SECURITY.md**: Security implementation details
- **API Docs**: See server/routes/ for endpoint documentation
- **Issues**: Check GitHub issues for common problems

---

**Happy Secure Messaging! 🔐**

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('../database');
const encryption = require('../encryption');
const auth = require('../auth');
const { authLimiter } = require('../security');

/**
 * Register a new user
 */
router.post('/register', authLimiter, [
  body('username').isLength({ min: 3, max: 20 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password with bcrypt
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Generate RSA key pair
    const { publicKey, privateKey } = encryption.generateKeyPair();

    // Insert user into database
    const result = await dbRun(
      `INSERT INTO users (username, email, password_hash, public_key)
       VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, publicKey]
    );

    await auth.logAuditEvent(result.lastID, 'USER_REGISTERED', { username }, req.ip);

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.lastID,
      publicKey
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Login user
 */
router.post('/login', authLimiter, [
  body('username').trim(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Check if account is locked
    const isLocked = await auth.isAccountLocked(username);
    if (isLocked) {
      await auth.logAuditEvent(null, 'LOGIN_ATTEMPT_LOCKED_ACCOUNT', { username }, req.ip);
      return res.status(429).json({ error: 'Account is temporarily locked due to too many failed login attempts' });
    }

    // Get user from database
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      await auth.recordFailedLogin(username, req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      await auth.recordFailedLogin(username, req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts
    await auth.resetFailedLogins(user.id);

    // Update last login
    await dbRun(
      'UPDATE users SET last_login = datetime("now") WHERE id = ?',
      [user.id]
    );

    // Generate token
    const token = auth.generateToken(user.id, user.username);

    // Create session
    await auth.createSession(user.id, token, req.ip, req.userAgent);

    // Log successful login
    await auth.logAuditEvent(user.id, 'USER_LOGIN', { username }, req.ip);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        publicKey: user.public_key
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Logout user
 */
router.post('/logout', auth.authenticateToken, async (req, res) => {
  try {
    // Revoke all sessions for this user
    await auth.revokeSessions(req.userId);
    
    // Add token to blacklist
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      auth.tokenBlacklist.add(token);
    }

    await auth.logAuditEvent(req.userId, 'USER_LOGOUT', {}, req.ip);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get user profile
 */
router.get('/profile', auth.authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, public_key, created_at, last_login FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({ error: 'Profile retrieval failed' });
  }
});

/**
 * Get all users (for messaging)
 */
router.get('/users', auth.authenticateToken, async (req, res) => {
  try {
    const users = await dbAll(
      'SELECT id, username, email, public_key FROM users WHERE id != ? AND is_active = 1',
      [req.userId]
    );

    res.json({ users });
  } catch (error) {
    console.error('Users retrieval error:', error);
    res.status(500).json({ error: 'Users retrieval failed' });
  }
});

/**
 * Change password
 */
router.post('/change-password', auth.authenticateToken, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordMatch = await bcryptjs.compare(currentPassword, user.password_hash);

    if (!passwordMatch) {
      await auth.logAuditEvent(req.userId, 'FAILED_PASSWORD_CHANGE', { reason: 'Incorrect password' }, req.ip);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcryptjs.genSalt(10);
    const newPasswordHash = await bcryptjs.hash(newPassword, salt);

    // Update password
    await dbRun(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.userId]
    );

    // Revoke all sessions (force re-login)
    await auth.revokeSessions(req.userId);

    await auth.logAuditEvent(req.userId, 'PASSWORD_CHANGED', {}, req.ip);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;

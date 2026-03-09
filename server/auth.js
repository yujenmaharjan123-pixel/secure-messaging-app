const jwt = require('jsonwebtoken');
const { dbGet, dbRun, dbAll } = require('./database');
const encryption = require('./encryption');

// Blacklist for revoked tokens (in production, use Redis)
const tokenBlacklist = new Set();

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session still exists in database
    const session = await dbGet(
      'SELECT * FROM sessions WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime("now")',
      [decoded.userId]
    );

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Create a session in database
 */
const createSession = async (userId, token, ipAddress, userAgent) => {
  const tokenHash = encryption.hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await dbRun(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, ipAddress, userAgent, expiresAt.toISOString()]
    );
    return true;
  } catch (error) {
    console.error('Session creation error:', error);
    return false;
  }
};

/**
 * Revoke all user sessions (logout from all devices)
 */
const revokeSessions = async (userId) => {
  try {
    await dbRun(
      'UPDATE sessions SET is_revoked = 1 WHERE user_id = ?',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Session revocation error:', error);
    return false;
  }
};

/**
 * Log audit event
 */
const logAuditEvent = async (userId, eventType, details, ipAddress) => {
  try {
    await dbRun(
      `INSERT INTO audit_log (user_id, event_type, details, ip_address)
       VALUES (?, ?, ?, ?)`,
      [userId, eventType, JSON.stringify(details), ipAddress]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

/**
 * Track failed login attempt
 */
const recordFailedLogin = async (username, ipAddress) => {
  try {
    const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (user) {
      const attempts = await dbGet(
        'SELECT failed_login_attempts FROM users WHERE id = ?',
        [user.id]
      );
      
      const newAttempts = (attempts?.failed_login_attempts || 0) + 1;
      const maxAttempts = process.env.MAX_LOGIN_ATTEMPTS || 5;

      if (newAttempts >= maxAttempts) {
        const lockoutTime = new Date(Date.now() + (process.env.LOCKOUT_TIME || 15) * 60 * 1000);
        await dbRun(
          'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
          [newAttempts, lockoutTime.toISOString(), user.id]
        );
        await logAuditEvent(user.id, 'ACCOUNT_LOCKED', { reason: 'Too many failed login attempts' }, ipAddress);
      } else {
        await dbRun(
          'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
          [newAttempts, user.id]
        );
      }
    }
    await logAuditEvent(null, 'FAILED_LOGIN_ATTEMPT', { username }, ipAddress);
  } catch (error) {
    console.error('Failed login recording error:', error);
  }
};

/**
 * Reset failed login attempts
 */
const resetFailedLogins = async (userId) => {
  try {
    await dbRun(
      'UPDATE users SET failed_login_attempts = 0 WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Failed login reset error:', error);
  }
};

/**
 * Check if account is locked
 */
const isAccountLocked = async (username) => {
  try {
    const user = await dbGet(
      'SELECT locked_until FROM users WHERE username = ?',
      [username]
    );
    
    if (user && user.locked_until) {
      const lockoutTime = new Date(user.locked_until);
      if (lockoutTime > new Date()) {
        return true;
      } else {
        // Lock expired, reset attempts
        await dbRun(
          'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = ?',
          [username]
        );
      }
    }
    return false;
  } catch (error) {
    console.error('Account lock check error:', error);
    return false;
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  createSession,
  revokeSessions,
  logAuditEvent,
  recordFailedLogin,
  resetFailedLogins,
  isAccountLocked,
  tokenBlacklist
};

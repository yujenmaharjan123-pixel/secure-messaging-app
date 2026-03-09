const rateLimit = require('express-rate-limit');
const { dbGet, dbRun } = require('./database');

/**
 * Rate limiter for general API requests (prevents DoS)
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // Check if IP is blocked
    const blockedIp = await dbGet(
      'SELECT * FROM blocked_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
      [req.ip]
    );
    return !!blockedIp;
  },
  handler: async (req, res) => {
    // Log suspicious activity
    const { dbRun } = require('./database');
    await dbRun(
      `INSERT INTO audit_log (event_type, details, ip_address)
       VALUES (?, ?, ?)`,
      ['RATE_LIMIT_EXCEEDED', 'API rate limit exceeded', req.ip]
    );
    res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
  }
});

/**
 * Strict rate limiter for authentication endpoints (prevents brute force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    const { dbRun } = require('./database');
    await dbRun(
      `INSERT INTO blocked_ips (ip_address, reason, expires_at)
       VALUES (?, ?, datetime('now', '+1 hour'))
       ON CONFLICT(ip_address) DO UPDATE SET expires_at = datetime('now', '+1 hour')`,
      [req.ip, 'Brute force attempt detected']
    );
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  }
});

/**
 * Middleware to extract client IP (handles proxies)
 */
const getClientIp = (req, res, next) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  req.ip = ip;
  req.userAgent = req.headers['user-agent'];
  next();
};

/**
 * Middleware to check if IP is blocked
 */
const checkBlockedIp = async (req, res, next) => {
  try {
    const blockedIp = await dbGet(
      'SELECT * FROM blocked_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
      [req.ip]
    );

    if (blockedIp) {
      return res.status(403).json({ error: 'Your IP address has been blocked due to suspicious activity' });
    }
    next();
  } catch (error) {
    console.error('IP check error:', error);
    next(); // Continue even if check fails
  }
};

/**
 * HTTPS only middleware
 */
const httpsOnly = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(403).json({ error: 'HTTPS required' });
  }
  next();
};

/**
 * Prevent MITM attacks by validating request origin
 */
const validateOrigin = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`Invalid origin attempted: ${origin}`);
    return res.status(403).json({ error: 'Invalid origin' });
  }
  next();
};

/**
 * CSRF protection - generate and validate tokens
 */
const csrfToken = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  
  if (!req.session.csrfToken) {
    const crypto = require('crypto');
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

const validateCsrfToken = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body.csrfToken;
  
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
};

/**
 * Middleware to add security headers
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  getClientIp,
  checkBlockedIp,
  httpsOnly,
  validateOrigin,
  csrfToken,
  validateCsrfToken,
  securityHeaders
};

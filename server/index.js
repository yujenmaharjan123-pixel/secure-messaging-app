require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

// Import security middleware
const {
  apiLimiter,
  getClientIp,
  checkBlockedIp,
  securityHeaders,
  validateOrigin
} = require('./security');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// ============== SECURITY MIDDLEWARE ==============
// Apply helmet for security headers
app.use(helmet());

// Add custom security headers
app.use(securityHeaders);

// Get client IP (for rate limiting and logging)
app.use(getClientIp);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ============== REQUEST PARSING ==============
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// ============== ROUTE MIDDLEWARE ==============
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Check blocked IP
app.use(checkBlockedIp);

// Apply rate limiting
app.use('/api/', apiLimiter);

// ============== API ROUTES ==============
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// ============== STATIC FILES ==============
// Serve static files from React build
const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Could not find index.html' });
    }
  });
});

// ============== ERROR HANDLING ==============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============== 404 HANDLER ==============
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============== SERVER STARTUP ==============
const server = app.listen(PORT, () => {
  console.log(`🔐 Secure Messaging Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  WARNING: Running in development mode. Use HTTPS in production!');
  }
});

// ============== GRACEFUL SHUTDOWN ==============
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = server;

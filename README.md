# Secure Client-Server Messaging Application

A comprehensive, production-ready secure messaging application with end-to-end encryption, user authentication, and multiple security features to prevent attacks like MITM, replay, and DoS.

## 🔐 Security Features

### Data Protection
- **End-to-End Encryption**: AES-256-GCM encryption for all messages
- **Data at Rest**: All messages stored encrypted in the database
- **Data in Transit**: HTTPS/TLS for all communications
- **Authentication Token**: JWT-based secure authentication

### User Authentication
- **Password Hashing**: bcryptjs with salt for secure password storage
- **Account Lockout**: Automatic lockout after 5 failed login attempts
- **Session Management**: Tracked sessions with expiration
- **Token Revocation**: Ability to logout from all devices

### Attack Prevention
- **Rate Limiting**: Prevents brute force and DoS attacks
- **CSRF Protection**: CSRF tokens for state-changing requests
- **MITM Prevention**: Enforces HTTPS and validates origin headers
- **Replay Attack Prevention**: Nonce-based message authentication
- **IP Blocking**: Automatic blocking of suspicious IP addresses
- **Input Validation**: Express-validator for all inputs
- **Security Headers**: Helmet.js for HTTP security headers

### Audit & Monitoring
- **Audit Logging**: All security events logged
- **Failed Login Tracking**: Records and acts on failed attempts
- **Activity Monitoring**: Session tracking and device information

## 📋 Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT, bcryptjs
- **Encryption**: Node.js crypto module (AES-256-GCM)
- **Security**: Helmet.js, Express Rate Limit
- **Validation**: Express Validator

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Encryption**: CryptoJS (client-side)
- **Icons**: Lucide React
- **Styling**: Custom CSS3 with modern design

### Testing
- **Unit Testing**: Jest
- **Integration Testing**: Supertest
- **Coverage**: Jest with coverage reporting

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup

```bash
# Navigate to project root
cd secure-messaging-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Initialize database and run tests
npm test

# Start server
npm start

# For development with auto-reload
npm run dev
```

### Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🔧 Environment Variables

```
PORT=5000
NODE_ENV=development
DB_PATH=./database/messages.db
JWT_SECRET=your_super_secret_key_change_this_in_production
ENCRYPTION_KEY=32_character_encryption_key_here
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Project Structure

```
secure-messaging-app/
├── server/
│   ├── routes/
│   │   ├── users.js          # User registration, login, profile
│   │   └── messages.js       # Messaging endpoints
│   ├── __tests__/
│   │   ├── unit/
│   │   │   └── encryption.test.js
│   │   └── integration/
│   │       └── api.test.js
│   ├── auth.js               # Authentication & session management
│   ├── database.js           # Database initialization
│   ├── encryption.js         # Encryption & hashing utilities
│   ├── security.js           # Security middleware
│   └── index.js              # Main server file
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Auth.css
│   │   │   └── Dashboard.css
│   │   ├── components/
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.jsx
│   ├── public/
│   │   └── index.html
│   └── package.json
├── database/
│   └── messages.db          # SQLite database (created on first run)
├── .env.example             # Environment variables template
├── package.json             # Project dependencies
└── README.md               # This file
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

## 📚 API Endpoints

### User Management
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `POST /api/users/logout` - Logout user
- `GET /api/users/profile` - Get user profile (protected)
- `GET /api/users/users` - Get all users (protected)
- `POST /api/users/change-password` - Change password (protected)

### Messaging
- `POST /api/messages/send` - Send encrypted message (protected)
- `GET /api/messages/conversation/:userId` - Get conversation (protected)
- `GET /api/messages/conversations` - Get all conversations (protected)
- `DELETE /api/messages/message/:messageId` - Delete message (protected)
- `GET /api/messages/unread-count` - Get unread count (protected)

## 🔒 Encryption Details

### Message Encryption
- **Algorithm**: AES-256-GCM
- **Key Length**: 256 bits
- **IV Length**: 128 bits
- **Authentication Tag**: 128 bits
- **Nonce**: Random 128 bits per message

### Password Hashing
- **Algorithm**: bcryptjs
- **Salt Rounds**: 10
- **Additional**: SHA256 hash of password + JWT_SECRET

### Database Storage
- Messages stored with encrypted content, IV, and auth tag
- Passwords never stored in plain text
- All sensitive data encrypted or hashed

## 🛡️ Security Best Practices

1. **Always use HTTPS in production** - Set NODE_ENV=production
2. **Change JWT_SECRET** - Use a strong, random secret
3. **Change ENCRYPTION_KEY** - Use a strong, random 32-char key
4. **Regular backups** - Back up SQLite database regularly
5. **Update dependencies** - Keep npm packages updated
6. **Monitor logs** - Check audit logs for suspicious activity
7. **Firewall configuration** - Restrict API access as needed
8. **Database security** - Secure database file permissions
9. **Rate limiting** - Adjust based on your needs
10. **CORS configuration** - Only allow trusted origins

## 📝 Database Schema

### Users Table
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password_hash
- public_key (RSA)
- created_at
- last_login
- failed_login_attempts
- locked_until
- is_active

### Messages Table
- id (PRIMARY KEY)
- sender_id (FOREIGN KEY)
- recipient_id (FOREIGN KEY)
- encrypted_content (JSON: ciphertext, iv, authTag)
- nonce
- is_read
- created_at

### Sessions Table
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- token_hash
- ip_address
- user_agent
- created_at
- expires_at
- is_revoked

### Audit Log Table
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- event_type
- details (JSON)
- ip_address
- timestamp

### Blocked IPs Table
- id (PRIMARY KEY)
- ip_address (UNIQUE)
- reason
- blocked_at
- expires_at

## 🎯 Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## 🚀 Deployment

### Using Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set ENCRYPTION_KEY=your_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### Using Docker

```bash
# Build image
docker build -t secure-messaging-app .

# Run container
docker run -p 5000:5000 secure-messaging-app
```

## 📊 Features

✅ User Registration & Login
✅ End-to-End Encrypted Messaging
✅ Real-time Conversation Management
✅ Unread Message Tracking
✅ Account Security Features
✅ Comprehensive Audit Logging
✅ Rate Limiting & DoS Protection
✅ CSRF Protection
✅ Session Management
✅ Password Change Functionality
✅ Responsive UI Design
✅ Unit & Integration Tests

## 🐛 Troubleshooting

### Database Locked Error
- Make sure only one server instance is running
- Check database file permissions

### CORS Errors
- Update ALLOWED_ORIGINS in .env
- Ensure frontend and backend are communicating correctly

### Token Expired
- Tokens expire after 24 hours
- User needs to login again

### Encryption Errors
- Verify ENCRYPTION_KEY is set correctly in .env
- Check database format for corrupted messages

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions, please create an issue in the repository.

## 📧 Contact

For security concerns, please report privately to the development team.

---

**Built with ❤️ for secure communication**

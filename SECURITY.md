# Security Documentation

## Overview

This document details all security features implemented in the Secure Client-Server Messaging Application.

## 1. Authentication & Authorization

### JWT (JSON Web Tokens)
- **Implementation**: Tokens issued on successful login
- **Expiration**: 24 hours
- **Verification**: Every protected endpoint verifies token validity
- **Blacklist**: Tokens added to blacklist on logout
- **Secret**: Configured via JWT_SECRET environment variable

### Password Security
- **Hashing Algorithm**: bcryptjs with 10 salt rounds
- **Storage**: Never stored in plain text
- **Validation**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Requirements**:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special character (@$!%*?&)

### Session Management
- **Session Tracking**: All sessions stored in database
- **Session Expiration**: 24 hours
- **Revocation**: Ability to logout from all devices
- **Device Information**: IP address and user agent stored
- **Concurrent Sessions**: Multiple sessions per user supported

## 2. Data Protection

### End-to-End Encryption (E2EE)
- **Algorithm**: AES-256-GCM (Advanced Encryption Standard 256-bit Galois/Counter Mode)
- **Key Derivation**: scrypt-based key derivation
- **IV (Initialization Vector)**: 16 bytes, randomly generated per message
- **Authentication Tag**: 16 bytes, prevents tampering
- **Nonce**: 16 bytes, prevents replay attacks

### Data at Rest
- **Location**: SQLite database
- **Encryption**: All message content encrypted before storage
- **Storage Format**: JSON with ciphertext, IV, authTag, nonce
- **Key Management**: Centralized key in environment variable

### Data in Transit
- **Protocol**: HTTPS/TLS (enforced in production)
- **Headers**: Security headers set via Helmet.js
- **Validation**: Origin header validation
- **CORS**: Restricted to trusted origins

## 3. Attack Prevention

### 1. Brute Force Attacks
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Account Lockout**: Automatic lockout after 5 failed attempts
- **Lockout Duration**: 15 minutes
- **Failed Attempt Tracking**: Stored in database

### 2. Distributed Denial of Service (DoS)
- **General Rate Limiting**: 100 requests per 15 minutes per IP
- **Endpoint-Specific**: Stricter limits on auth endpoints
- **IP Blocking**: Automatic blocking of IPs exceeding limits
- **Block Duration**: 1 hour (configurable)
- **Tracking**: Audit log records all rate limit violations

### 3. Man-in-the-Middle (MITM) Attacks
- **HTTPS Enforcement**: Enforced in production via HSTS header
- **Origin Validation**: Checks request origin header
- **CORS Configuration**: Whitelist of allowed origins
- **Certificate Pinning**: Ready for implementation
- **Security Headers**:
  - Strict-Transport-Security
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy

### 4. Replay Attacks
- **Nonce-Based**: Each message includes random nonce
- **Authentication Tag**: Detects any message modification
- **Session Tokens**: Hash-based token validation
- **Timestamp Validation**: Can be added per request

### 5. Cross-Site Request Forgery (CSRF)
- **CSRF Tokens**: Can be implemented via middleware
- **SameSite Cookies**: Can be enabled for cookies
- **Origin Verification**: Validates request origin
- **State Validation**: Token-based request validation

### 6. Cross-Site Scripting (XSS)
- **Content-Security-Policy**: Restrictive CSP headers
- **Input Sanitization**: Express-validator sanitizes inputs
- **Output Encoding**: React automatically escapes output
- **No Eval**: No dynamic code execution

### 7. SQL Injection
- **Parameterized Queries**: All database queries use parameters
- **Input Validation**: Express-validator validates all inputs
- **Type Checking**: Strict type validation
- **Prepared Statements**: SQLite3 module uses prepared statements

### 8. Phishing Protection
- **Domain Validation**: Validates request origins
- **HTTPS Enforcement**: Prevents interception
- **User Education**: UI prompts for secure behavior

## 4. Input Validation & Sanitization

### User Input Validation
- **Username**: Min 3, max 20 characters, alphanumeric
- **Email**: Valid email format validation
- **Password**: Strength validation (see password requirements)
- **Message Content**: Max 5000 characters
- **User IDs**: Integer validation

### Validation Methods
- **Express-Validator**: Server-side validation
- **Type Checking**: Runtime type verification
- **Length Limits**: Prevents buffer overflow
- **Special Character Handling**: Escaped appropriately

## 5. Logging & Monitoring

### Audit Log Events
- User registration
- User login (successful and failed)
- User logout
- Password changes
- Message sending
- Message deletion
- Account lockouts
- Login attempts from locked accounts
- Rate limit violations
- IP blocking events

### Logged Information
- Timestamp
- User ID (if applicable)
- Event type
- Details (JSON formatted)
- Client IP address
- User agent (for login events)

### Security Benefits
- **Forensics**: Trace user activities
- **Anomaly Detection**: Identify suspicious patterns
- **Compliance**: Audit trail for regulations
- **Investigation**: Review security incidents

## 6. Database Security

### Database Structure
- SQLite3 with file-based storage
- Separate tables for different data types
- Foreign key constraints enabled
- Indexes on frequently queried columns

### Access Control
- File permissions: 600 (read/write for owner only)
- No public database access
- Connection pooling not needed for SQLite
- Backup procedures recommended

### Data Integrity
- Foreign key constraints
- Unique constraints on usernames and emails
- Timestamp auditing
- Transaction support

## 7. API Security

### Authentication
- All endpoints except /register and /login require JWT
- Token passed via Authorization header
- Bearer token format expected
- Token validation on every request

### Rate Limiting
- API endpoints: 100 requests/15 min per IP
- Auth endpoints: 5 attempts/15 min per IP
- Custom limits per endpoint possible
- IP-based tracking

### Response Security
- No sensitive data in error messages (production mode)
- Error details hidden from clients
- Stack traces only in development
- Consistent error format

### Payload Limits
- JSON payload: 10KB limit
- URL-encoded payload: 10KB limit
- Prevents buffer overflow attacks
- Configurable per endpoint

## 8. Encryption Key Management

### Key Generation
- Encryption key: 32 characters (256 bits)
- JWT secret: Strong random string
- Generated via crypto module
- Stored in environment variables

### Key Rotation
- Not currently implemented (can be added)
- Requires database migration strategy
- Old keys needed for decryption of old messages
- Plan ahead for key rotation

### Key Storage
- Environment variables (.env file)
- Never committed to git
- Loaded at startup
- Accessible only to server process

### Key Security
- Not exposed in logs
- Not sent to client
- Unique per environment
- Changed periodically (recommended)

## 9. Configuration Security

### Environment Variables
- JWT_SECRET: JWT signing key
- ENCRYPTION_KEY: Message encryption key
- PORT: Server port
- NODE_ENV: Execution environment
- DB_PATH: Database file path
- MAX_LOGIN_ATTEMPTS: Failed login threshold
- LOCKOUT_TIME: Account lockout duration
- RATE_LIMIT_WINDOW: Rate limit window
- RATE_LIMIT_MAX_REQUESTS: Requests per window

### Configuration Best Practices
- Load from .env file
- Never commit .env to git
- Use .env.example as template
- Validate on startup
- Different values per environment

## 10. Frontend Security

### Client-Side Encryption
- Messages encrypted before transmission (optional layer)
- Uses CryptoJS for additional protection
- Prevents middleware interception
- Complements server-side encryption

### Session Storage
- JWT stored in localStorage
- Cleared on logout
- No sensitive data in localStorage
- Protected from XSS via CSP

### Input Validation
- React form validation
- Client-side checks before submission
- Server-side validation (final check)
- User feedback on validation errors

## 11. Compliance & Standards

### Industry Standards
- OWASP Top 10 mitigation
- NIST Cybersecurity Framework
- CWE (Common Weakness Enumeration) awareness
- Best practices for web application security

### Regulations
- GDPR: Data protection and privacy
- CCPA: User data rights
- SOC 2: Security controls
- PCI DSS: For payment systems (if applicable)

## 12. Security Testing

### Unit Tests
- Encryption/decryption functionality
- Hash function consistency
- Token generation and validation
- Key pair generation

### Integration Tests
- User registration and login
- Authentication flow
- Message sending and retrieval
- Authorization checks
- Rate limiting

### Manual Testing
- Penetration testing recommendations
- Security headers verification
- HTTPS enforcement testing
- Rate limit testing
- Error message review

## 13. Vulnerability Management

### Known Issues
- None identified currently
- Regular security audits recommended
- Dependency updates tracked
- npm audit run regularly

### Dependency Security
- Lock file (package-lock.json) used
- Regular updates recommended
- Audit vulnerabilities with `npm audit`
- Use `npm audit fix` for patches

### Reporting Vulnerabilities
- Email security team privately
- Do not disclose publicly
- Allow time for fix before disclosure
- Follow responsible disclosure practices

## 14. Deployment Security

### Production Checklist
- [ ] NODE_ENV=production
- [ ] Change JWT_SECRET
- [ ] Change ENCRYPTION_KEY
- [ ] Enable HTTPS/TLS
- [ ] Update ALLOWED_ORIGINS
- [ ] Review rate limiting settings
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Back up database
- [ ] Restrict file permissions
- [ ] Use firewall rules
- [ ] Keep dependencies updated

### Deployment Platforms
- **Heroku**: Set config vars, not .env
- **Docker**: Use secrets, not environment files
- **AWS**: Use Secrets Manager
- **Azure**: Use Key Vault
- **Self-hosted**: Use environment management

## 15. Security Recommendations

### Short Term (Immediate)
1. Review all environment variables
2. Verify HTTPS is enabled
3. Test rate limiting
4. Review audit logs
5. Update dependencies

### Medium Term (1-3 months)
1. Implement penetration testing
2. Add security headers testing
3. Implement automated security scanning
4. Set up intrusion detection
5. Create incident response plan

### Long Term (6+ months)
1. Implement key rotation
2. Add multi-factor authentication
3. Implement end-to-end encryption (client-side)
4. Add biometric authentication
5. Implement advanced threat detection

## 16. Security Contacts

### Reporting Security Issues
- Email: security@example.com
- Phone: +1-XXX-XXX-XXXX
- PGP Key: Available on website

### Support
- Issue tracker: GitHub Issues
- Email support: support@example.com
- Documentation: See README.md

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Production Ready

const crypto = require('crypto');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

class EncryptionService {
  constructor() {
    // Generate a master key from environment variable
    const masterKeyStr = process.env.ENCRYPTION_KEY || crypto.randomBytes(KEY_LENGTH).toString('hex');
    this.masterKey = crypto.scryptSync(masterKeyStr, 'salt', KEY_LENGTH);
  }

  /**
   * Encrypt a message using AES-256-GCM
   * @param {string} plaintext - The message to encrypt
   * @returns {object} - Contains ciphertext, iv, authTag, and salt
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.masterKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        nonce: crypto.randomBytes(16).toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a message using AES-256-GCM
   * @param {string} ciphertext - The encrypted message
   * @param {string} iv - Initialization vector
   * @param {string} authTag - Authentication tag
   * @returns {string} - The decrypted plaintext
   */
  decrypt(ciphertext, iv, authTag) {
    try {
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM,
        this.masterKey,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed - possible tampering detected');
    }
  }

  /**
   * Generate a hash for password storage
   * @param {string} password - The password to hash
   * @returns {string} - The hashed password
   */
  hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password + process.env.JWT_SECRET);
    return hash.digest('hex');
  }

  /**
   * Generate a random token
   * @returns {string} - Random token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage
   * @param {string} token - Token to hash
   * @returns {string} - Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate RSA key pair for user
   * @returns {object} - Public and private keys
   */
  generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }
}

module.exports = new EncryptionService();

const encryption = require('../encryption');

describe('EncryptionService', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a message correctly', () => {
      const plaintext = 'Hello, this is a secret message!';
      const encrypted = encryption.encrypt(plaintext);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('nonce');

      const decrypted = encryption.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt different messages to different ciphertexts', () => {
      const plaintext = 'Test message';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong auth tag', () => {
      const plaintext = 'Secret message';
      const encrypted = encryption.encrypt(plaintext);

      // Tamper with auth tag
      const wrongAuthTag = 'wrongauthtag';

      expect(() => {
        encryption.decrypt(encrypted.ciphertext, encrypted.iv, wrongAuthTag);
      }).toThrow();
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long messages', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hash functions', () => {
    it('should generate consistent password hashes', () => {
      const password = 'TestPassword123!';
      const hash1 = encryption.hashPassword(password);
      const hash2 = encryption.hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different passwords', () => {
      const hash1 = encryption.hashPassword('Password1!');
      const hash2 = encryption.hashPassword('Password2!');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate random tokens', () => {
      const token1 = encryption.generateToken();
      const token2 = encryption.generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should hash tokens consistently', () => {
      const token = encryption.generateToken();
      const hash1 = encryption.hashToken(token);
      const hash2 = encryption.hashToken(token);

      expect(hash1).toBe(hash2);
    });
  });

  describe('key generation', () => {
    it('should generate RSA key pair', () => {
      const { publicKey, privateKey } = encryption.generateKeyPair();

      expect(publicKey).toBeDefined();
      expect(privateKey).toBeDefined();
      expect(publicKey).toContain('BEGIN PUBLIC KEY');
      expect(privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('should generate different key pairs', () => {
      const pair1 = encryption.generateKeyPair();
      const pair2 = encryption.generateKeyPair();

      expect(pair1.publicKey).not.toBe(pair2.publicKey);
      expect(pair1.privateKey).not.toBe(pair2.privateKey);
    });
  });
});

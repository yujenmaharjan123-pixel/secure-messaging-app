const request = require('supertest');
const path = require('path');

// Mock environment for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-';
process.env.DB_PATH = path.join(__dirname, 'test.db');
process.env.NODE_ENV = 'test';

const server = require('../../index');

describe('User Authentication API', () => {
  let testToken;
  let testUserId;

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.userId).toBeDefined();
      expect(response.body.publicKey).toBeDefined();

      testUserId = response.body.userId;
    });

    it('should reject weak passwords', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject mismatched passwords', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          username: 'testuser3',
          email: 'test3@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'DifferentPass123!'
        });

      expect(response.statusCode).toBe(400);
    });

    it('should reject duplicate usernames', async () => {
      // First registration
      await request(server)
        .post('/api/users/register')
        .send({
          username: 'duplicate',
          email: 'dup1@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });

      // Try duplicate
      const response = await request(server)
        .post('/api/users/register')
        .send({
          username: 'duplicate',
          email: 'dup2@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject duplicate emails', async () => {
      const email = 'unique@example.com';

      // First registration
      await request(server)
        .post('/api/users/register')
        .send({
          username: 'user1',
          email: email,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });

      // Try duplicate email
      const response = await request(server)
        .post('/api/users/register')
        .send({
          username: 'user2',
          email: email,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/users/login', () => {
    beforeAll(async () => {
      // Register a user first
      await request(server)
        .post('/api/users/register')
        .send({
          username: 'logintest',
          email: 'logintest@example.com',
          password: 'LoginPass123!',
          confirmPassword: 'LoginPass123!'
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          username: 'logintest',
          password: 'LoginPass123!'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('logintest');

      testToken = response.body.token;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          username: 'logintest',
          password: 'WrongPassword123!'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          username: 'nonexistent',
          password: 'SomePass123!'
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/users/profile', () => {
    beforeAll(async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          username: 'logintest',
          password: 'LoginPass123!'
        });

      testToken = response.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('logintest');
    });

    it('should reject without token', async () => {
      const response = await request(server)
        .get('/api/users/profile');

      expect(response.statusCode).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/users/users', () => {
    it('should get list of users', async () => {
      const response = await request(server)
        .get('/api/users/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('POST /api/users/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(server)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should reject further requests after logout', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.statusCode).toBe(401);
    });
  });
});

describe('Messaging API', () => {
  let user1Token, user1Id;
  let user2Token, user2Id;

  beforeAll(async () => {
    // Register and login two users
    let response = await request(server)
      .post('/api/users/register')
      .send({
        username: 'msguser1',
        email: 'msguser1@example.com',
        password: 'MsgPass123!',
        confirmPassword: 'MsgPass123!'
      });
    user1Id = response.body.userId;

    response = await request(server)
      .post('/api/users/login')
      .send({
        username: 'msguser1',
        password: 'MsgPass123!'
      });
    user1Token = response.body.token;

    response = await request(server)
      .post('/api/users/register')
      .send({
        username: 'msguser2',
        email: 'msguser2@example.com',
        password: 'MsgPass123!',
        confirmPassword: 'MsgPass123!'
      });
    user2Id = response.body.userId;

    response = await request(server)
      .post('/api/users/login')
      .send({
        username: 'msguser2',
        password: 'MsgPass123!'
      });
    user2Token = response.body.token;
  });

  describe('POST /api/messages/send', () => {
    it('should send encrypted message successfully', async () => {
      const response = await request(server)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          content: 'Hello User 2!'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.messageId).toBeDefined();
      expect(response.body.message).toBe('Message sent successfully');
    });

    it('should reject message to self', async () => {
      const response = await request(server)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user1Id,
          content: 'Message to self'
        });

      expect(response.statusCode).toBe(400);
    });

    it('should reject message to non-existent user', async () => {
      const response = await request(server)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: 99999,
          content: 'Invalid recipient'
        });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('should get conversations list', async () => {
      const response = await request(server)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.conversations)).toBe(true);
    });
  });

  describe('GET /api/messages/unread-count', () => {
    it('should get unread message count', async () => {
      const response = await request(server)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.unreadCount).toBeDefined();
    });
  });
});

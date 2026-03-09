const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbGet, dbRun, dbAll } = require('../database');
const encryption = require('../encryption');
const auth = require('../auth');

/**
 * Send an encrypted message
 */
router.post('/send', auth.authenticateToken, [
  body('recipientId').isInt(),
  body('content').isLength({ min: 1, max: 5000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId, content } = req.body;
    const senderId = req.userId;

    // Verify recipient exists
    const recipient = await dbGet('SELECT id FROM users WHERE id = ?', [recipientId]);

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Encrypt the message
    const encrypted = encryption.encrypt(content);

    // Store encrypted message in database
    const result = await dbRun(
      `INSERT INTO messages (sender_id, recipient_id, encrypted_content, nonce)
       VALUES (?, ?, ?, ?)`,
      [senderId, recipientId, JSON.stringify({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag
      }), encrypted.nonce]
    );

    // Log message sending
    await auth.logAuditEvent(senderId, 'MESSAGE_SENT', { 
      messageId: result.lastID,
      recipientId,
      contentLength: content.length 
    }, req.ip);

    res.status(201).json({
      message: 'Message sent successfully',
      messageId: result.lastID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Message sending error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Get messages between two users
 */
router.get('/conversation/:userId', auth.authenticateToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const currentUserId = req.userId;

    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Verify other user exists
    const otherUser = await dbGet('SELECT id FROM users WHERE id = ?', [otherUserId]);

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversation messages
    const messages = await dbAll(
      `SELECT id, sender_id, recipient_id, encrypted_content, nonce, is_read, created_at
       FROM messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    // Mark messages as read
    await dbRun(
      `UPDATE messages 
       SET is_read = 1 
       WHERE recipient_id = ? AND sender_id = ? AND is_read = 0`,
      [currentUserId, otherUserId]
    );

    // Parse encrypted content for response
    const parsedMessages = messages.map(msg => {
      try {
        const encrypted = JSON.parse(msg.encrypted_content);
        return {
          id: msg.id,
          senderId: msg.sender_id,
          recipientId: msg.recipient_id,
          encrypted,
          nonce: msg.nonce,
          isRead: msg.is_read,
          createdAt: msg.created_at
        };
      } catch (e) {
        console.error('Error parsing encrypted message:', e);
        return null;
      }
    }).filter(m => m !== null);

    res.json({ messages: parsedMessages });
  } catch (error) {
    console.error('Conversation retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
});

/**
 * Get all conversations (latest message from each user)
 */
router.get('/conversations', auth.authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get list of users we've messaged with and latest message
    const conversations = await dbAll(
      `SELECT DISTINCT 
        CASE 
          WHEN sender_id = ? THEN recipient_id 
          ELSE sender_id 
        END as other_user_id,
        MAX(created_at) as latest_message_time
       FROM messages
       WHERE sender_id = ? OR recipient_id = ?
       GROUP BY other_user_id
       ORDER BY latest_message_time DESC`,
      [userId, userId, userId]
    );

    // Get user details for each conversation
    const conversationDetails = [];
    for (const conv of conversations) {
      const user = await dbGet(
        'SELECT id, username, email FROM users WHERE id = ?',
        [conv.other_user_id]
      );

      // Get unread count
      const unreadCount = await dbGet(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND sender_id = ? AND is_read = 0',
        [userId, conv.other_user_id]
      );

      if (user) {
        conversationDetails.push({
          userId: user.id,
          username: user.username,
          email: user.email,
          latestMessageTime: conv.latest_message_time,
          unreadCount: unreadCount?.count || 0
        });
      }
    }

    res.json({ conversations: conversationDetails });
  } catch (error) {
    console.error('Conversations retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

/**
 * Delete a message
 */
router.delete('/message/:messageId', auth.authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.userId;

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Get message
    const message = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender or recipient can delete
    if (message.sender_id !== userId && message.recipient_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete message
    await dbRun('DELETE FROM messages WHERE id = ?', [messageId]);

    await auth.logAuditEvent(userId, 'MESSAGE_DELETED', { messageId }, req.ip);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Message deletion error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * Get unread message count
 */
router.get('/unread-count', auth.authenticateToken, async (req, res) => {
  try {
    const unreadCount = await dbGet(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0',
      [req.userId]
    );

    res.json({ unreadCount: unreadCount?.count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;

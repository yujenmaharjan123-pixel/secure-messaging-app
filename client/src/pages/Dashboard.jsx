import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Send, Plus, Menu, X, Lock, Shield } from 'lucide-react';
import CryptoJS from 'crypto-js';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Encryption key (in production, this should be derived from user's key)
  const ENCRYPTION_KEY = 'secure-messaging-app-encryption-key-2024';

  useEffect(() => {
    fetchConversations();
    fetchUsers();
    fetchUnreadCount();
    
    // Poll for new messages
    const interval = setInterval(() => {
      if (selectedUserId) {
        fetchConversation(selectedUserId);
      }
      fetchUnreadCount();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUserId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchConversation = async (userId) => {
    try {
      const response = await fetch(`/api/messages/conversation/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const decryptedMessages = data.messages.map(msg => ({
          ...msg,
          content: decryptMessage(msg.encrypted)
        }));
        setMessages(decryptedMessages);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const encryptMessage = (content) => {
    return CryptoJS.AES.encrypt(content, ENCRYPTION_KEY).toString();
  };

  const decryptMessage = (encrypted) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return '[Decryption failed]';
    }
  };

  const handleSelectConversation = (userId) => {
    setSelectedUserId(userId);
    setShowUserList(false);
    fetchConversation(userId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedUserId,
          content: messageText.trim()
        })
      });

      if (response.ok) {
        setMessageText('');
        fetchConversation(selectedUserId);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const selectedUser = conversations.find(c => c.userId === selectedUserId) || 
                       users.find(u => u.id === selectedUserId);

  const getOtherUserFromConversation = (conversation) => {
    return users.find(u => u.id === conversation.userId);
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${showUserList ? 'show' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Shield size={28} className="logo-icon" />
            <span>Secure Chat</span>
          </div>
          <button className="mobile-close" onClick={() => setShowUserList(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <p className="user-name">{user?.username}</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>

        <div className="conversations-list">
          <div className="section-header">
            <h3>Conversations</h3>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </div>

          {conversations.length === 0 ? (
            <p className="empty-state">No conversations yet</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.userId}
                className={`conversation-item ${selectedUserId === conv.userId ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.userId)}
              >
                <div className="conversation-avatar">
                  {conv.username?.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-info">
                  <p className="conversation-name">{conv.username}</p>
                  <p className="conversation-time">
                    {new Date(conv.latestMessageTime).toLocaleDateString()}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="message-badge">{conv.unreadCount}</span>
                )}
              </div>
            ))
          )}
        </div>

        <button className="new-message-btn" onClick={() => setShowUserList(!showUserList)}>
          <Plus size={20} />
          <span>New Message</span>
        </button>

        {showUserList && (
          <div className="users-list">
            <h4>Select a contact</h4>
            {users.filter(u => !conversations.some(c => c.userId === u.id)).map(u => (
              <div
                key={u.id}
                className="user-item"
                onClick={() => handleSelectConversation(u.id)}
              >
                <div className="user-avatar-small">{u.username?.charAt(0).toUpperCase()}</div>
                <div className="user-info-small">
                  <p>{u.username}</p>
                  <p className="user-email-small">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="chat-container">
        {selectedUserId && selectedUser ? (
          <>
            <div className="chat-header">
              <button className="mobile-menu" onClick={() => setShowUserList(!showUserList)}>
                <Menu size={24} />
              </button>
              <div className="chat-header-info">
                <h2>{selectedUser.username || selectedUser.name}</h2>
                <p className="header-status">
                  <Lock size={14} /> Encrypted conversation
                </p>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <Lock size={48} />
                  <p>Start a secure conversation</p>
                  <p className="text-muted">Messages are encrypted end-to-end</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderId === user?.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{msg.content}</p>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a secure message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={loading}
                className="message-input"
              />
              <button
                type="submit"
                className="send-btn"
                disabled={loading || !messageText.trim()}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <Shield size={64} />
            <h2>Welcome to Secure Messaging</h2>
            <p>Select a conversation or start a new chat</p>
            <p className="features">
              🔐 End-to-end encrypted • 🛡️ Secure authentication • 📱 Real-time messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

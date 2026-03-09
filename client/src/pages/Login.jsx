import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);

    if (result.success) {
      navigate('/');
    } else {
      setLocalError(result.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-bg-shape auth-bg-1"></div>
        <div className="auth-bg-shape auth-bg-2"></div>
        <div className="auth-bg-shape auth-bg-3"></div>
      </div>

      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="auth-icon">
            <Lock size={32} />
          </div>
          <h1>Secure Messaging</h1>
          <p>Sign in to your account</p>
        </div>

        {(error || localError) && (
          <div className="alert alert-error flex">
            <AlertCircle size={20} className="mt-0" />
            <span>{error || localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Sign up here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;

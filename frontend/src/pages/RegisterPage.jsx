import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import './AuthPages.css';

function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Decorative background elements */}
        <div className="auth-decoration auth-decoration-1"></div>
        <div className="auth-decoration auth-decoration-2"></div>

        {/* Auth Card */}
        <div className="glass-card auth-card animate-slide-up">
          <div className="auth-header">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Join the civic community</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Error Alert */}
            {error && (
              <div className="glass-alert error animate-jelly">
                <div className="glass-alert-icon">!</div>
                <div className="glass-alert-content">
                  <div className="glass-alert-message">{error}</div>
                </div>
              </div>
            )}

            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="glass-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="glass-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="glass-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <p className="form-hint">Must be at least 6 characters</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-button primary auth-submit-btn"
            >
              {loading ? (
                <>
                  <span className="animate-spin">↻</span> Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="glass-divider"></div>

          {/* Sign In Link */}
          <div className="auth-footer">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="auth-info-box glass-card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="info-item">
            <span className="info-icon">✓</span>
            <span>Free to join</span>
          </div>
          <div className="info-item">
            <span className="info-icon">◆</span>
            <span>Your data is secure</span>
          </div>
          <div className="info-item">
            <span className="info-icon">◈</span>
            <span>Make a difference</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
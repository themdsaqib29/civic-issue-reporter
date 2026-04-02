import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import apiClient from '../services/apiClient';
import './AuthPages.css';

function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch public analytics data for non-logged-in users
    const fetchAnalytics = async () => {
      try {
        const response = await apiClient.get('/issues/public/analytics');
        if (response.data.success) {
          const issues = response.data.data || [];
          
          // Calculate statistics
          const totalIssues = issues.length;
          const highPriority = issues.filter(i => i.priority_score >= 7).length;
          const avgVotes = issues.length > 0 
            ? Math.round(issues.reduce((sum, i) => sum + (i.vote_count || 0), 0) / issues.length)
            : 0;
          
          // Top areas
          const areaCount = {};
          issues.forEach(issue => {
            const area = issue.location_address || 'Unknown';
            areaCount[area] = (areaCount[area] || 0) + 1;
          });
          
          const topAreas = Object.entries(areaCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([area, count]) => ({ area, count }));
          
          setAnalytics({
            totalIssues,
            highPriority,
            avgVotes,
            topAreas
          });
        }
      } catch (err) {
        // Silently fail - show empty analytics if endpoint is not accessible
        // This prevents infinite redirect loops during authentication
        console.log('Analytics not available on login page');
      }
    };

    fetchAnalytics();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your account</p>
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-button primary auth-submit-btn"
            >
              {loading ? (
                <>
                  <span className="animate-spin">↻</span> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="glass-divider"></div>

          {/* Sign Up Link */}
          <div className="auth-footer">
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create one now
              </Link>
            </p>
          </div>
        </div>

        {/* Analytics Dashboard Box */}
        {analytics && (
          <div className="auth-analytics-box glass-card animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="analytics-title">Community Pulse</h3>
            
            <div className="analytics-grid">
              <div className="analytics-stat">
                <div className="stat-value">{analytics.totalIssues}</div>
                <div className="stat-label">Issues Reported</div>
              </div>
              
              <div className="analytics-stat">
                <div className="stat-value">{analytics.highPriority}</div>
                <div className="stat-label">High Priority</div>
              </div>
              
              <div className="analytics-stat">
                <div className="stat-value">{analytics.avgVotes}</div>
                <div className="stat-label">Avg. Support</div>
              </div>
            </div>

            {analytics.topAreas && analytics.topAreas.length > 0 && (
              <div className="analytics-section">
                <h4 className="section-title">Most Reported Areas</h4>
                <div className="areas-list">
                  {analytics.topAreas.map((item, idx) => (
                    <div key={idx} className="area-item">
                      <span className="area-name">{item.area}</span>
                      <span className="area-badge">{item.count} reports</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="analytics-cta">Sign in to explore detailed analytics and contribute to your community</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
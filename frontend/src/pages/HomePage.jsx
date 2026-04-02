import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAuthenticated } from '../services/authService';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isLoggedIn = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="home-wrapper">
      <div className="home-container">
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">Civic Issue Reporter</h1>
          <p className="hero-subtitle">
            AI-Powered Community Voice Platform
          </p>
          <p className="hero-description">
            Report, discover, and resolve civic issues together with your community
          </p>
        </div>

        {isLoggedIn ? (
          <>
            {/* Welcome Card */}
            <div className="glass-card welcome-card animate-slide-up">
              <div className="welcome-header">
                <div>
                  <h2 className="welcome-title">Welcome back</h2>
                  <p className="welcome-name">{user?.name || 'Citizen'}</p>
                </div>
                <div className="user-badge glass-badge">
                  {user?.role === 'admin' && 'Admin'}
                  {user?.role === 'dept_admin' && 'Dept Admin'}
                  {(!user?.role || (user?.role !== 'admin' && user?.role !== 'dept_admin')) && 'Citizen'}
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="actions-grid">
              {/* Report Issue Card */}
              <button
                onClick={() => navigate('/report-issue')}
                className="action-card glass-card action-primary hover-scale"
              >
                <div className="action-icon">▲</div>
                <h3 className="action-title">Report an Issue</h3>
                <p className="action-description">Share a civic concern with the community</p>
              </button>

              {/* Browse Issues Card */}
              <button
                onClick={() => navigate('/issues')}
                className="action-card glass-card action-secondary hover-scale"
              >
                <div className="action-icon">◈</div>
                <h3 className="action-title">Browse Issues</h3>
                <p className="action-description">Discover and vote on reported issues</p>
              </button>

              {/* My Issues Card */}
              <button
                onClick={() => navigate('/my-issues')}
                className="action-card glass-card action-accent hover-scale"
              >
                <div className="action-icon">✓</div>
                <h3 className="action-title">My Issues</h3>
                <p className="action-description">Track issues you've reported</p>
              </button>

              {/* Analytics Card */}
              <button
                onClick={() => navigate('/stats')}
                className="action-card glass-card action-info hover-scale"
              >
                <div className="action-icon">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="1.2em" height="1.2em" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.8" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ display: 'inline-block', verticalAlign: 'middle' }}
                  >
                    <defs>
                      <mask id="search-mask">
                        <rect width="24" height="24" fill="white" />
                        {/* Enlarged mask circle to perfectly cut the bar behind */}
                        <circle cx="18" cy="18" r="4.5" fill="black" />
                      </mask>
                    </defs>
                    
                    {/* Trend Line & Arrow - Completely cleared from the bars */}
                    <path d="M 2 11 L 7 5 L 11 9 L 21 2" />
                    <path d="M 15 2 h 6 v 6" />
                    
                    {/* 3 Analytics Bars - 3rd is the TALLEST but safely below the trendline */}
                    <g mask="url(#search-mask)">
                      <rect x="2" y="15" width="4" height="7" rx="0.5" />
                      <rect x="8" y="12" width="4" height="10" rx="0.5" />
                      <rect x="14" y="9" width="4" height="13" rx="0.5" />
                    </g>
                    
                    {/* Magnifying Glass - Shifted outwards to bottom right */}
                    <circle cx="18" cy="18" r="4" />
                    <path d="M 20.8 20.8 l 2.2 2.2" strokeWidth="2.5" />
                  </svg>
                </div>
                <h3 className="action-title">Analytics</h3>
                <p className="action-description">View community statistics</p>
              </button>

              {/* Admin Panel Card (if applicable) */}
              {(user?.role === 'admin' || user?.role === 'dept_admin') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="action-card glass-card action-danger hover-scale"
                >
                  <div className="action-icon">◆</div>
                  <h3 className="action-title">
                    {user?.role === 'admin' ? 'Admin Panel' : 'Department Admin'}
                  </h3>
                  <p className="action-description">
                    {user?.role === 'admin'
                      ? 'Manage platform and issues'
                      : 'Manage department issues'}
                  </p>
                </button>
              )}
            </div>

            {/* User Info & Logout */}
            <div className="user-footer">
              <div className="user-email">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="glass-button logout-btn"
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Features Section for Non-Logged-In Users */}
            <div className="features-section">
              <div className="feature glass-card animate-slide-up">
                <div className="feature-icon">→</div>
                <h3>Easy Reporting</h3>
                <p>Report civic issues in minutes with our AI-powered form</p>
              </div>

              <div className="feature glass-card animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="feature-icon">◇</div>
                <h3>Community Voice</h3>
                <p>Vote and comment on issues to amplify your concerns</p>
              </div>

              <div className="feature glass-card animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="feature-icon">≡</div>
                <h3>Real-time Insights</h3>
                <p>Track how your community addresses issues together</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="auth-button-group">
              <button
                onClick={() => navigate('/login')}
                className="glass-button primary"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="glass-button"
              >
                Create Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;

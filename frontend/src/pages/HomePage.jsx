import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAuthenticated } from '../services/authService';

function HomePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isLoggedIn = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Civic Issue Reporter</h1>
        <p style={styles.subtitle}>
          AI-Powered Civic Issue Reporting Platform
        </p>

        {isLoggedIn ? (
          <>
            <h2 style={styles.welcome}>
              Welcome, {user?.name || 'Citizen'} 👋
            </h2>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => navigate('/report-issue')}
                style={styles.primaryButton}
              >
                🚨 Report an Issue
              </button>

              <button
                onClick={() => navigate('/issues')}
                style={styles.secondaryButton}
              >
                📊 View All Issues
              </button>

              <button
                onClick={() => navigate('/stats')}
                style={styles.statsButton}
              >
                📈 View Analytics
              </button>
            </div>

            <p style={styles.email}>{user?.email}</p>

            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </>
        ) : (
          <div style={styles.buttonGroup}>
            <button
              onClick={() => navigate('/login')}
              style={styles.loginButton}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              style={styles.registerButton}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #e9ecef, #dee2e6)',
    padding: '20px',
  },

  card: {
    backgroundColor: 'white',
    padding: '50px 60px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '520px',
    maxWidth: '100%',
  },

  title: {
    fontSize: '42px',
    marginBottom: '10px',
    color: '#212529',
    fontWeight: '700',
  },

  subtitle: {
    fontSize: '16px',
    color: '#6c757d',
    marginBottom: '35px',
  },

  welcome: {
    fontSize: '22px',
    marginBottom: '30px',
    fontWeight: '600',
    color: '#343a40',
  },

  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '25px',
  },

  primaryButton: {
    padding: '14px',
    fontSize: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  secondaryButton: {
    padding: '14px',
    fontSize: '16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  statsButton: {
    padding: '14px',
    fontSize: '16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  loginButton: {
    padding: '14px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  registerButton: {
    padding: '14px',
    fontSize: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  email: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '20px',
  },

  logoutButton: {
    padding: '12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    width: '100%',
  },
};

export default HomePage;

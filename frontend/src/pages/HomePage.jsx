import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAuthenticated } from '../services/authService';

function HomePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isLoggedIn = isAuthenticated();

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Civic Issue Reporter</h1>
      <p style={styles.subtitle}>AI-Powered Civic Issue Reporting Platform</p>
      
      {isLoggedIn ? (
        <div style={styles.userSection}>
          <p style={styles.welcome}>Welcome, {user?.name}!</p>
          <p style={styles.email}>{user?.email}</p>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      ) : (
        <div style={styles.buttonGroup}>
          <button onClick={() => navigate('/login')} style={styles.loginButton}>
            Login
          </button>
          <button onClick={() => navigate('/register')} style={styles.registerButton}>
            Register
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  title: {
    fontSize: '48px',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '20px',
    color: '#666',
    marginBottom: '40px',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '20px',
  },
  loginButton: {
    padding: '12px 30px',
    fontSize: '18px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  registerButton: {
    padding: '12px 30px',
    fontSize: '18px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  userSection: {
    textAlign: 'center',
  },
  welcome: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  email: {
    color: '#666',
    marginBottom: '20px',
  },
  logoutButton: {
    padding: '12px 30px',
    fontSize: '18px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default HomePage;
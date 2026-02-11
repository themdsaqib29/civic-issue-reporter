import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function IssuesListPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await apiClient.get('/issues');
      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (score) => {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  };

  const getPriorityLabel = (score) => {
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  };

  if (loading) {
    return <div style={styles.loading}>Loading issues...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📋 All Reported Issues</h2>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/report-issue')} style={styles.reportButton}>
            ➕ Report New Issue
          </button>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            🏠 Home
          </button>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{issues.length}</div>
          <div style={styles.statLabel}>Total Issues</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {issues.filter(i => i.priority_score >= 7).length}
          </div>
          <div style={styles.statLabel}>High Priority</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {issues.filter(i => i.status === 'Pending').length}
          </div>
          <div style={styles.statLabel}>Pending</div>
        </div>
      </div>

      <div style={styles.issuesList}>
        {issues.length === 0 ? (
          <div style={styles.noIssues}>
            <p>No issues reported yet.</p>
            <button onClick={() => navigate('/report-issue')} style={styles.reportButton}>
              Report First Issue
            </button>
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} style={styles.issueCard}>
              <div style={styles.cardHeader}>
                <div style={styles.categoryBadge}>{issue.category}</div>
                <div
                  style={{
                    ...styles.priorityBadge,
                    backgroundColor: getPriorityColor(issue.priority_score)
                  }}
                >
                  {getPriorityLabel(issue.priority_score)}
                </div>
              </div>
              
              <h3 style={styles.title}>{issue.title}</h3>
              <p style={styles.description}>{issue.description}</p>
              
              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  📍 {issue.location_address}
                </span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  🏢 {issue.department_name || 'Unassigned'}
                </span>
                <span style={styles.metaItem}>
                  📊 Priority: {issue.priority_score}/10
                </span>
              </div>
              
              <div style={styles.cardFooter}>
                <span style={styles.status}>
                  {issue.status === 'Pending' ? '🕐' : '✅'} {issue.status}
                </span>

<button
  onClick={async (e) => {
    e.stopPropagation();
    try {
      const response = await apiClient.get(`/issues/${issue.id}/email-preview`);
      if (response.data.success) {
        const { to, subject, body } = response.data.data;
        alert(`EMAIL PREVIEW\n\nTo: ${to}\n\nSubject: ${subject}\n\n${body}`);
      }
    } catch (err) {
      alert('Failed to load email preview');
    }
  }}
  style={{
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  }}
>
  📧 View Email
</button>
                <span style={styles.date}>
                  {new Date(issue.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerButtons: {
    display: 'flex',
    gap: '10px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  reportButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '100px 20px',
    fontSize: '18px',
    color: '#666',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  issuesList: {
    display: 'grid',
    gap: '20px',
  },
  noIssues: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
  },
  issueCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  categoryBadge: {
    fontSize: '13px',
    color: '#007bff',
    fontWeight: '600',
    backgroundColor: '#e7f3ff',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  title: {
    margin: '10px 0',
    fontSize: '18px',
    color: '#333',
  },
  description: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
    marginTop: '15px',
  },
  status: {
    fontSize: '14px',
    padding: '4px 12px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
  },
  date: {
    fontSize: '13px',
    color: '#999',
  },
};

export default IssuesListPage;
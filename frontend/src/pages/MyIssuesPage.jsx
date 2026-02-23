import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function MyIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMyIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/issues/my-issues');

      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Please log in to view your reports.");
        navigate('/login');
      }
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMyIssues();
  }, [fetchMyIssues]);

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
    return <div style={styles.loading}>Loading your history...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>👤 My Reporting History</h2>
        <button onClick={() => navigate('/issues')} style={styles.backButton}>
          ← Back to All Issues
        </button>
      </div>

      {issues.length === 0 ? (
        <div style={styles.noIssues}>
          <p>You haven't reported any issues yet.</p>
          <button onClick={() => navigate('/report-issue')} style={styles.reportButton}>
            Report an Issue
          </button>
        </div>
      ) : (
        <div style={styles.issuesList}>
          {issues.map((issue) => (
            <div key={issue.id} style={styles.issueCard}>
              
              {/* HEADER */}
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: '#333' }}>#{issue.id}</strong>
                  <div style={styles.categoryBadge}>{issue.category}</div>
                </div>
                <div style={{ ...styles.priorityBadge, backgroundColor: getPriorityColor(issue.priority_score) }}>
                  {getPriorityLabel(issue.priority_score)} ({issue.priority_score}/10)
                </div>
              </div>

              {/* BODY */}
              <h3 style={styles.title}>{issue.title}</h3>
              <p style={styles.description}>{issue.description}</p>
              
              <div style={styles.metaRow}>
                <span style={styles.metaItem}>📍 {issue.location_address}</span>
              </div>

              {/* 📸 REPORTED & RESOLVED PHOTO GALLERY */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
                
                {/* REPORTED PHOTO */}
                {issue.image_url && (
                  <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>📸 Reported Photo:</p>
                    <img 
                      src={issue.image_url} 
                      alt="Reported Evidence" 
                      style={{ maxWidth: '200px', maxHeight: '130px', borderRadius: '4px', cursor: 'pointer', objectFit: 'cover' }}
                      onClick={() => window.open(issue.image_url, '_blank')}
                    />
                  </div>
                )}

                {/* RESOLVED PHOTO (Only shows if admin resolved it) */}
                {issue.resolved_image_url && (
                  <div style={{ padding: '10px', backgroundColor: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#155724' }}>✅ Resolved Photo:</p>
                    <img 
                      src={issue.resolved_image_url} 
                      alt="Resolution Evidence" 
                      style={{ maxWidth: '200px', maxHeight: '130px', borderRadius: '4px', cursor: 'pointer', objectFit: 'cover' }}
                      onClick={() => window.open(issue.resolved_image_url, '_blank')}
                    />
                    {issue.resolution_notes && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#155724', maxWidth: '200px', wordWrap: 'break-word' }}>
                        <strong>Notes:</strong> {issue.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div style={styles.cardFooter}>
                <span style={{ 
                  ...styles.status, 
                  backgroundColor: issue.status === 'Resolved' ? '#d4edda' : '#fff3cd',
                  color: issue.status === 'Resolved' ? '#155724' : '#856404'
                }}>
                  {issue.status === 'Pending' ? '🕐' : '✅'} {issue.status}
                </span>

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const response = await apiClient.get(`/issues/${issue.id}/email-preview`);
                      if (response.data.success) {
                        const { to, subject, body } = response.data.data;
                        alert(`EMAIL SENT TO DEPARTMENT\n\nTo: ${to}\n\nSubject: ${subject}\n\n${body}`);
                      }
                    } catch (err) {
                      alert('Failed to load email preview');
                    }
                  }}
                  style={styles.emailButton}
                >
                  📧 View Sent Email
                </button>
                
                <span style={styles.date}>
                  Reported: {new Date(issue.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  backButton: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  reportButton: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' },
  loading: { textAlign: 'center', padding: '100px 20px', fontSize: '18px', color: '#666' },
  issuesList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  noIssues: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  issueCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  categoryBadge: { fontSize: '13px', color: '#007bff', fontWeight: '600', backgroundColor: '#e7f3ff', padding: '4px 12px', borderRadius: '12px' },
  priorityBadge: { padding: '4px 12px', borderRadius: '12px', color: 'white', fontSize: '12px', fontWeight: 'bold' },
  title: { margin: '10px 0', fontSize: '18px', color: '#333' },
  description: { color: '#666', lineHeight: '1.6', marginBottom: '15px' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '10px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #eee', marginTop: '15px' },
  status: { fontSize: '14px', padding: '4px 12px', borderRadius: '4px', fontWeight: '600' },
  emailButton: { padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  date: { fontSize: '13px', color: '#999' },
};

export default MyIssuesPage;
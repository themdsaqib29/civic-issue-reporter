import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveData, setResolveData] = useState({
    resolution_notes: '',
    resolved_image_url: ''
  });
  const [resolving, setResolving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const [issuesRes, statsRes] = await Promise.all([
        apiClient.get(`/admin/issues?${params}`),
        apiClient.get('/admin/stats')
      ]);

      if (issuesRes.data.success) setIssues(issuesRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 403) {
        alert('Admin access required');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      const response = await apiClient.patch(`/admin/issues/${issueId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        fetchData();
        alert(`Status updated to ${newStatus}`);
      }
    } catch (error) {
      alert('Failed to update status: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleResolve = async (issueId) => {
    if (!resolveData.resolved_image_url) {
      alert('Please provide the resolved image URL (upload to Cloudinary first)');
      return;
    }
    try {
      setResolving(true);
      const response = await apiClient.post(`/admin/issues/${issueId}/resolve`, resolveData);
      if (response.data.success) {
        alert('✅ Issue resolved! Citizen has been notified via email.');
        setSelectedIssue(null);
        setResolveData({ resolution_notes: '', resolved_image_url: '' });
        fetchData();
      }
    } catch (error) {
      alert('Failed to resolve: ' + (error.response?.data?.error || error.message));
    } finally {
      setResolving(false);
    }
  };

  const handleSendEmail = async (issueId) => {
    try {
      const response = await apiClient.post(`/issues/${issueId}/send-email`);
      if (response.data.success) {
        alert('📧 Email sent to department!');
        fetchData();
      }
    } catch (error) {
      alert('Email failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const getPriorityColor = (score) => {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#ffc107',
      'Acknowledged': '#17a2b8',
      'In Progress': '#007bff',
      'Resolved': '#28a745',
      'Closed': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) return <div style={styles.loading}>Loading Admin Dashboard...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🛡️ Admin Dashboard</h1>
          <p style={styles.headerSubtitle}>Chennai Civic Issue Management</p>
        </div>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Back to Home
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #007bff' }}>
            <div style={styles.statValue}>{stats.overview.total}</div>
            <div style={styles.statLabel}>Total Issues</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #ffc107' }}>
            <div style={styles.statValue}>{stats.overview.pending}</div>
            <div style={styles.statLabel}>Pending</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #17a2b8' }}>
            <div style={styles.statValue}>{stats.overview.in_progress}</div>
            <div style={styles.statLabel}>In Progress</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
            <div style={styles.statValue}>{stats.overview.resolved}</div>
            <div style={styles.statLabel}>Resolved</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #dc3545' }}>
            <div style={styles.statValue}>{stats.overview.high_priority}</div>
            <div style={styles.statLabel}>High Priority</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #6f42c1' }}>
            <div style={styles.statValue}>{stats.overview.emails_sent}</div>
            <div style={styles.statLabel}>Emails Sent</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <h3 style={{ margin: 0 }}>📋 Issue Queue</h3>
        <div style={styles.filters}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            style={styles.filterSelect}
          >
            <option value="">All Priorities</option>
            <option value="high">High (7-10)</option>
            <option value="medium">Medium (4-6)</option>
            <option value="low">Low (1-3)</option>
          </select>

          <button onClick={fetchData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div style={styles.issuesContainer}>
        {issues.length === 0 ? (
          <div style={styles.noIssues}>No issues found for selected filters.</div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} style={styles.issueCard}>
              <div style={styles.issueCardHeader}>
                <div style={styles.issueCardLeft}>
                  <span style={styles.issueId}>#{issue.id}</span>
                  <span style={styles.categoryTag}>{issue.category}</span>
                  <span
                    style={{
                      ...styles.priorityBadge,
                      backgroundColor: getPriorityColor(issue.priority_score)
                    }}
                  >
                    Priority: {issue.priority_score}/10
                  </span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(issue.status)
                    }}
                  >
                    {issue.status}
                  </span>
                </div>
                <div style={styles.issueDate}>
                  {new Date(issue.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>

              <div style={styles.issueBody}>
                <p style={styles.issueDescription}>{issue.description}</p>
                <div style={styles.issueMeta}>
                  <span>📍 {issue.location_address}</span>
                  <span>👤 {issue.citizen_name} ({issue.citizen_email})</span>
                  <span>🏢 {issue.department_name || 'Unassigned'}</span>
                  <span>📧 Email: {issue.email_sent ? '✅ Sent' : '❌ Not Sent'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                {issue.status === 'Pending' && (
                  <button
                    onClick={() => handleStatusUpdate(issue.id, 'Acknowledged')}
                    style={styles.acknowledgeButton}
                  >
                    👁️ Acknowledge
                  </button>
                )}

                {issue.status === 'Acknowledged' && (
                  <button
                    onClick={() => handleStatusUpdate(issue.id, 'In Progress')}
                    style={styles.inProgressButton}
                  >
                    🔧 Mark In Progress
                  </button>
                )}

                {!issue.email_sent && (
                  <button
                    onClick={() => handleSendEmail(issue.id)}
                    style={styles.emailButton}
                  >
                    📧 Send Email
                  </button>
                )}

                {issue.status !== 'Resolved' && issue.status !== 'Closed' && (
                  <button
                    onClick={() => setSelectedIssue(issue)}
                    style={styles.resolveButton}
                  >
                    ✅ Resolve Issue
                  </button>
                )}

                {issue.resolved_image_url && (
                  <a 
                    href={issue.resolved_image_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{...styles.btn, backgroundColor: '#fd7e14', textDecoration: 'none'}}
                  >
                    📸 View Proof
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {selectedIssue && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>✅ Resolve Issue #{selectedIssue.id}</h3>
            <p style={{ color: '#666' }}>
              <strong>{selectedIssue.category}</strong> at {selectedIssue.location_address}
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                📸 Resolved Image URL <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Upload image and paste URL here (Cloudinary/ImgBB/etc)"
                value={resolveData.resolved_image_url}
                onChange={(e) => setResolveData({
                  ...resolveData,
                  resolved_image_url: e.target.value
                })}
                style={styles.input}
              />
              <small style={{ color: '#666' }}>
                Upload photo at imgbb.com or cloudinary.com, then paste the URL
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>📝 Resolution Notes</label>
              <textarea
                placeholder="Describe what was done to fix this issue..."
                value={resolveData.resolution_notes}
                onChange={(e) => setResolveData({
                  ...resolveData,
                  resolution_notes: e.target.value
                })}
                style={styles.textarea}
                rows={4}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={() => handleResolve(selectedIssue.id)}
                disabled={resolving || !resolveData.resolved_image_url}
                style={styles.confirmButton}
              >
                {resolving ? 'Resolving...' : '✅ Confirm Resolution'}
              </button>
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setResolveData({ resolution_notes: '', resolved_image_url: '' });
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f0f2f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '20px 30px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    color: '#212529',
  },
  headerSubtitle: {
    margin: '5px 0 0 0',
    color: '#6c757d',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
    color: '#666',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '25px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#212529',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6c757d',
    marginTop: '5px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '15px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  issuesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  noIssues: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '10px',
    color: '#666',
    fontSize: '18px',
  },
  issueCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  issueCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  issueCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  issueId: {
    fontWeight: '700',
    fontSize: '16px',
    color: '#333',
  },
  categoryTag: {
    backgroundColor: '#e7f3ff',
    color: '#007bff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  priorityBadge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  statusBadge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '13px',
  },
  issueDate: {
    fontSize: '13px',
    color: '#999',
  },
  issueBody: {
    marginBottom: '15px',
  },
  issueDescription: {
    color: '#333',
    marginBottom: '10px',
    lineHeight: '1.6',
  },
  issueMeta: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: '#666',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
  },
  acknowledgeButton: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  inProgressButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  emailButton: {
    padding: '8px 16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  resolveButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  viewPhotoButton: {
    padding: '8px 16px',
    backgroundColor: '#fd7e14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    textDecoration: 'none',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '500px',
    maxWidth: '90vw',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
  },
};

export default AdminDashboard;
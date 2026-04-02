import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import './MyIssuesPage.css';

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

  const getPriorityLabel = (score) => {
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  };

  if (loading) {
    return <div className="my-issues-loading">Loading your reports...</div>;
  }

  return (
    <div className="my-issues-container">
      <div className="my-issues-header glass-card">
        <div>
          <h2 className="my-issues-title">My Reporting History</h2>
          <p className="my-issues-subtitle">Track and manage your civic reports</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="glass-button ghost"
        >
          ◆ Back to Home
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="glass-card no-issues-state">
          <p className="no-issues-message">You haven't reported any issues yet.</p>
          <button 
            onClick={() => navigate('/report-issue')} 
            className="glass-button primary"
            style={{ marginTop: '16px' }}
          >
            ▲ Report Your First Issue
          </button>
        </div>
      ) : (
        <div className="my-issues-list">
          {issues.map((issue) => (
            <div key={issue.id} className="glass-card issue-card animate-slide-up">
              
              {/* HEADER */}
              <div className="issue-card-header">
                <div className="issue-id-badge">#{issue.id}</div>
                <div className="issue-category">{issue.category}</div>
                <div
                  className="issue-priority-badge"
                  data-priority={getPriorityLabel(issue.priority_score)}
                >
                  {getPriorityLabel(issue.priority_score)} ({issue.priority_score}/10)
                </div>
              </div>

              {/* TITLE & DESCRIPTION */}
              <h3 className="issue-title">{issue.title}</h3>
              <p className="issue-description">{issue.description}</p>
              
              <div className="issue-meta">
                <span className="meta-item">
                  ◆ {issue.location_address}
                </span>
              </div>

              {/* PHOTO GALLERY */}
              <div className="issue-photos">
                {issue.image_url && (
                  <div className="photo-container reported">
                    <p className="photo-label">Reported Photo</p>
                    <img 
                      src={issue.image_url} 
                      alt="Reported Evidence" 
                      className="issue-photo"
                      onClick={() => window.open(issue.image_url, '_blank')}
                    />
                  </div>
                )}

                {issue.resolved_image_url && (
                  <div className="photo-container resolved">
                    <p className="photo-label">Resolution Photo</p>
                    <img 
                      src={issue.resolved_image_url} 
                      alt="Resolution Evidence" 
                      className="issue-photo"
                      onClick={() => window.open(issue.resolved_image_url, '_blank')}
                    />
                    {issue.resolution_notes && (
                      <p className="resolution-notes">
                        <strong>Notes:</strong> {issue.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="issue-card-footer">
                <span 
                  className="issue-status"
                  data-status={issue.status}
                >
                  {issue.status === 'Pending' ? '→' : '✓'} {issue.status}
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
                  className="glass-button secondary"
                >
                  ◎ View Email
                </button>
                
                <span className="issue-date">
                  {new Date(issue.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyIssuesPage;
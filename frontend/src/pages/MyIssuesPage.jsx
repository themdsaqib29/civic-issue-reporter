import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function MyIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // -----------------------------
  // Fetch My Issues (useCallback FIX)
  // -----------------------------
  const fetchMyIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/issues/my-issues');

      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        alert("Please log in to view your reports.");
        navigate('/login');
      }
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // -----------------------------
  // useEffect FIX
  // -----------------------------
  useEffect(() => {
    fetchMyIssues();
  }, [fetchMyIssues]);

  const getPriorityColor = (score) => {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px' }}>
        Loading your history...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        fontFamily: 'sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <h2>👤 My Reporting History</h2>
        <button
          onClick={() => navigate('/issues')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to All Issues
        </button>
      </div>

      {issues.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}
        >
          <p>You haven't reported any issues yet.</p>
          <button
            onClick={() => navigate('/report-issue')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Report an Issue
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center'
                  }}
                >
                  <strong>#{issue.id}</strong>
                  <span
                    style={{
                      backgroundColor: '#e9ecef',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {issue.category}
                  </span>
                </div>

                <span
                  style={{
                    backgroundColor: getPriorityColor(issue.priority_score),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Priority: {issue.priority_score}/10
                </span>
              </div>

              <h3 style={{ margin: '10px 0' }}>{issue.title}</h3>
              <p style={{ color: '#555', marginBottom: '15px' }}>
                {issue.description}
              </p>

              <p style={{ fontSize: '13px', color: '#666' }}>
                📍 {issue.location_address}
              </p>

              {/* Before/After Photo Logic */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                {issue.image_url && (
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #eee'
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 5px 0',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#666'
                      }}
                    >
                      Your Photo:
                    </p>
                    <img
                      src={issue.image_url}
                      alt="Reported"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '100px',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                )}

                {issue.resolved_image_url && (
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: '#d4edda',
                      borderRadius: '4px',
                      border: '1px solid #c3e6cb'
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 5px 0',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#155724'
                      }}
                    >
                      Resolution Proof:
                    </p>
                    <img
                      src={issue.resolved_image_url}
                      alt="Resolved"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '100px',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid #eee'
                }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    color:
                      issue.status === 'Resolved'
                        ? '#28a745'
                        : '#856404'
                  }}
                >
                  Status: {issue.status}
                </span>

                <span style={{ fontSize: '13px', color: '#888' }}>
                  Reported:{' '}
                  {new Date(issue.created_at).toLocaleDateString()}
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
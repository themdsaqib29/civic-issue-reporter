import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function IssuesListPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votedIssues, setVotedIssues] = useState(new Set());
  const [searchArea, setSearchArea] = useState('');

  const navigate = useNavigate();

  // -----------------------------
  // Check Votes
  // -----------------------------
  const checkVotes = useCallback(async (issuesList) => {
    try {
      const checks = issuesList.map(issue =>
        apiClient
          .get(`/issues/${issue.id}/vote-check`)
          .then(res => ({ id: issue.id, voted: res.data.hasVoted }))
          .catch(() => ({ id: issue.id, voted: false }))
      );

      const results = await Promise.all(checks);
      const voted = new Set(results.filter(r => r.voted).map(r => r.id));
      setVotedIssues(voted);
    } catch (error) {
      console.error('Error checking vote statuses', error);
    }
  }, []);

  // -----------------------------
  // Fetch Issues
  // -----------------------------
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/issues');
      if (response.data.success) {
        const data = response.data.data;
        setIssues(data);
        await checkVotes(data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [checkVotes]);

  // -----------------------------
  // useEffect (Corrected)
  // -----------------------------
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // -----------------------------
  // Handle Vote
  // -----------------------------
  const handleVote = async (e, issueId) => {
    e.stopPropagation();

    try {
      const hasVoted = votedIssues.has(issueId);

      if (hasVoted) {
        await apiClient.delete(`/issues/${issueId}/vote`);
        setVotedIssues(prev => {
          const newSet = new Set(prev);
          newSet.delete(issueId);
          return newSet;
        });
      } else {
        await apiClient.post(`/issues/${issueId}/vote`);
        setVotedIssues(prev => new Set([...prev, issueId]));
      }

      fetchIssues();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('You must be logged in to vote!');
      } else {
        alert(error.response?.data?.error || 'Failed to process vote');
      }
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

  const filteredIssues = issues.filter(issue =>
    issue.location_address?.toLowerCase().includes(searchArea.toLowerCase())
  );

  if (loading) {
    return <div style={styles.loading}>Loading issues...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📋 All Reported Issues</h2>
        <div style={styles.headerButtons}>
          <button
            onClick={() => navigate('/my-issues')}
            style={{ ...styles.btn, backgroundColor: '#17a2b8' }}
          >
            👤 My Reports
          </button>
          <button
            onClick={() => navigate('/report-issue')}
            style={{ ...styles.btn, backgroundColor: '#28a745' }}
          >
            ➕ Report New Issue
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ ...styles.btn, backgroundColor: '#6c757d' }}
          >
            🏠 Home
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Search by Area..."
          value={searchArea}
          onChange={(e) => setSearchArea(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 15px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={styles.issuesList}>
        {filteredIssues.length === 0 ? (
          <div style={styles.noIssues}>
            <p>No issues found for this area.</p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div key={issue.id} style={styles.issueCard}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <strong>#{issue.id}</strong>
                  <div style={styles.categoryBadge}>
                    {issue.category}
                  </div>
                </div>

                <div
                  style={{
                    ...styles.priorityBadge,
                    backgroundColor: getPriorityColor(issue.priority_score)
                  }}
                >
                  {getPriorityLabel(issue.priority_score)}
                </div>
              </div>

              <h3>{issue.title}</h3>
              <p>{issue.description}</p>

              <div style={styles.voteSection}>
                <button
                  onClick={(e) => handleVote(e, issue.id)}
                  style={{
                    ...styles.voteButton,
                    backgroundColor: votedIssues.has(issue.id)
                      ? '#28a745'
                      : '#e9ecef',
                    color: votedIssues.has(issue.id)
                      ? 'white'
                      : '#333'
                  }}
                >
                  {votedIssues.has(issue.id)
                    ? '✓ Voted'
                    : '👍 Upvote'} ({issue.vote_count || 0})
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  headerButtons: { display: 'flex', gap: '10px' },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer'
  },
  loading: { textAlign: 'center', padding: '50px' },
  issuesList: { display: 'grid', gap: '20px' },
  noIssues: { textAlign: 'center', padding: '40px' },
  issueCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  categoryBadge: {
    backgroundColor: '#e7f3ff',
    padding: '4px 10px',
    borderRadius: '12px'
  },
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    color: 'white'
  },
  voteSection: {
    marginTop: '15px'
  },
  voteButton: {
    padding: '6px 14px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default IssuesListPage;
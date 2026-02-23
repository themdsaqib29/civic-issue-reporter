import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function IssuesListPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votedIssues, setVotedIssues] = useState(new Set());
  const [searchArea, setSearchArea] = useState('');
  
  const navigate = useNavigate();

  // 1. Wrap checkVotes in useCallback
  const checkVotes = useCallback(async (issuesList) => {
    try {
      const checks = issuesList.map(issue => 
        apiClient.get(`/issues/${issue.id}/vote-check`)
          .then(res => ({ id: issue.id, voted: res.data.hasVoted }))
          .catch(() => ({ id: issue.id, voted: false }))
      );
      
      const results = await Promise.all(checks);
      const voted = new Set(results.filter(r => r.voted).map(r => r.id));
      setVotedIssues(voted);
    } catch (error) {
      console.error("Error checking vote statuses", error);
    }
  }, []);

  // 2. Wrap fetchIssues in useCallback
  const fetchIssues = useCallback(async () => {
    try {
      const response = await apiClient.get('/issues');
      if (response.data.success) {
        setIssues(response.data.data);
        checkVotes(response.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [checkVotes]);

  // 3. Add fetchIssues to the dependency array (Warning Fixed!)
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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
        alert("You must be logged in to vote!");
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
    issue.location_address.toLowerCase().includes(searchArea.toLowerCase())
  );

  if (loading) {
    return <div style={styles.loading}>Loading issues...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📋 All Reported Issues</h2>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/my-issues')} style={{...styles.btn, backgroundColor: '#17a2b8'}}>
            👤 My Reports
          </button>
          <button onClick={() => navigate('/report-issue')} style={{...styles.btn, backgroundColor: '#28a745'}}>
            ➕ Report New Issue
          </button>
          <button onClick={() => navigate('/')} style={{...styles.btn, backgroundColor: '#6c757d'}}>
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

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Search by Area (e.g., Anna Nagar, Vadapalani)..." 
          value={searchArea}
          onChange={(e) => setSearchArea(e.target.value)}
          style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
        />
      </div>

      <div style={styles.issuesList}>
        {filteredIssues.length === 0 ? (
          <div style={styles.noIssues}>
            <p>No issues found for this area.</p>
            {searchArea === '' && (
               <button onClick={() => navigate('/report-issue')} style={{...styles.btn, backgroundColor: '#28a745', marginTop: '10px'}}>
                 Report First Issue
               </button>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div key={issue.id} style={styles.issueCard}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: '#333' }}>#{issue.id}</strong>
                  <div style={styles.categoryBadge}>{issue.category}</div>
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
                  </div>
                )}
              </div>
              
              <div style={styles.voteSection}>
                <button
                  onClick={(e) => handleVote(e, issue.id)}
                  style={{
                    ...styles.voteButton,
                    backgroundColor: votedIssues.has(issue.id) ? '#28a745' : '#e9ecef',
                    color: votedIssues.has(issue.id) ? 'white' : '#333',
                    border: votedIssues.has(issue.id) ? 'none' : '1px solid #ccc'
                  }}
                >
                  {votedIssues.has(issue.id) ? '✓ Voted' : '👍 Upvote'} ({issue.vote_count || 0})
                </button>
                <span style={styles.voteHelp}>
                  {votedIssues.has(issue.id) 
                    ? 'You supported this issue.' 
                    : 'Vote if you also experience this issue!'}
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
                        alert(`EMAIL SENT TO DEPARTMENT\n\nTo: ${to}\n\nSubject: ${subject}\n\n${body}`);
                      }
                    } catch (err) {
                      alert('Failed to load email preview');
                    }
                  }}
                  style={{...styles.btn, backgroundColor: '#007bff', fontSize: '12px'}}
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
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  headerButtons: { display: 'flex', gap: '10px' },
  btn: { padding: '10px 20px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  loading: { textAlign: 'center', padding: '100px 20px', fontSize: '18px', color: '#666' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  statNumber: { fontSize: '36px', fontWeight: 'bold', color: '#007bff' },
  statLabel: { fontSize: '14px', color: '#666', marginTop: '5px' },
  issuesList: { display: 'grid', gap: '20px' },
  noIssues: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '8px' },
  issueCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  categoryBadge: { fontSize: '13px', color: '#007bff', fontWeight: '600', backgroundColor: '#e7f3ff', padding: '4px 12px', borderRadius: '12px' },
  priorityBadge: { padding: '4px 12px', borderRadius: '12px', color: 'white', fontSize: '12px', fontWeight: 'bold' },
  title: { margin: '10px 0', fontSize: '18px', color: '#333' },
  description: { color: '#666', lineHeight: '1.6', marginBottom: '15px' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '10px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  voteSection: { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' },
  voteButton: { padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s ease' },
  voteHelp: { fontSize: '12px', color: '#888', fontStyle: 'italic' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #eee', marginTop: '15px' },
  status: { fontSize: '14px', padding: '4px 12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', fontWeight: '500' },
  date: { fontSize: '13px', color: '#999' },
};

export default IssuesListPage;
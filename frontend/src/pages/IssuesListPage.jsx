import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import './IssuesListPage.css';

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

  const getPriorityLabel = (score) => {
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  };

  const filteredIssues = issues.filter(issue => 
    issue.location_address.toLowerCase().includes(searchArea.toLowerCase())
  );

  if (loading) {
    return <div className="issues-loading">Loading issues...</div>;
  }

  return (
    <div className="issues-container">
      <div className="issues-header glass-card">
        <div>
          <h2 className="issues-title">All Reported Issues</h2>
          <p className="issues-subtitle">Browse and support community issues</p>
        </div>
        <div className="issues-header-buttons">
          <button 
            onClick={() => navigate('/report-issue')} 
            className="glass-button primary"
          >
            ▲ Report New Issue
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="glass-button ghost"
          >
            ◆ Home
          </button>
        </div>
      </div>

      <div className="issues-stats">
        <div className="glass-card stat-card">
          <div className="stat-number">{issues.length}</div>
          <div className="stat-label">Total Issues</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-number">
            {issues.filter(i => i.priority_score >= 7).length}
          </div>
          <div className="stat-label">High Priority</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-number">
            {issues.filter(i => i.status === 'Pending').length}
          </div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-number">
            {issues.filter(i => i.status === 'Resolved').length}
          </div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      <div className="issues-search glass-card">
        <span className="search-icon">≡</span>
        <input 
          type="text" 
          placeholder="Search by area (e.g., Anna Nagar, Vadapalani)..." 
          value={searchArea}
          onChange={(e) => setSearchArea(e.target.value)}
          className="glass-input search-input"
        />
      </div>

      <div className="issues-list">
        {filteredIssues.length === 0 ? (
          <div className="glass-card no-issues">
            <p className="no-issues-text">No issues found for this area.</p>
            {searchArea === '' && (
               <button 
                 onClick={() => navigate('/report-issue')} 
                 className="glass-button primary"
                 style={{ marginTop: '16px' }}
               >
                 Report First Issue
               </button>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div key={issue.id} className="glass-card issue-card animate-slide-up">
              <div className="issue-card-header">
                <div className="issue-id-badge">#{issue.id}</div>
                <div className="issue-category-badge">{issue.category}</div>
                <div
                  className="issue-priority-badge"
                  data-priority={getPriorityLabel(issue.priority_score)}
                >
                  {getPriorityLabel(issue.priority_score)}
                </div>
              </div>
              
              <h3 className="issue-title">{issue.title}</h3>
              <p className="issue-description">{issue.description}</p>
              
              <div className="issue-meta">
                <span className="meta-item">
                  ◆ {issue.location_address}
                </span>
                <span className="meta-item">
                  ≡ {issue.department_name || 'Unassigned'}
                </span>
                <span className="meta-item">
                  ★ {issue.priority_score}/10
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
                  </div>
                )}
              </div>
              
              <div className="issue-vote-section">
                <button
                  onClick={(e) => handleVote(e, issue.id)}
                  className={`glass-button vote-button ${votedIssues.has(issue.id) ? 'voted' : ''}`}
                >
                  {votedIssues.has(issue.id) ? '✓ Voted' : '▲ Upvote'} ({issue.vote_count || 0})
                </button>
                <span className="vote-help">
                  {votedIssues.has(issue.id) 
                    ? 'You supported this issue.' 
                    : 'Vote if you experience this issue!'}
                </span>
              </div>
              
              <div className="issue-card-footer">
                <span className="issue-status" data-status={issue.status}>
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
                  style={{ fontSize: '12px' }}
                >
                  ◎ View Email
                </button>
                <span className="issue-date">
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

export default IssuesListPage;
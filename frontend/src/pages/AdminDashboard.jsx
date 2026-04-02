import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import apiClient from '../services/apiClient';
import './AdminDashboard.css';

function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  
  // Role-Based Access States
  const [userRole, setUserRole] = useState(null);
  const [departmentScope, setDepartmentScope] = useState(null);

  // Modal State
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveData, setResolveData] = useState({ resolution_notes: '', resolved_image_url: '' });
  const [resolving, setResolving] = useState(false);
  const [uploadingAdminImage, setUploadingAdminImage] = useState(false);
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  useEffect(() => {
    fetchData(true); 
    loadCachedInsights(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchData = async (showLoadingScreen = true) => {
    try {
      if (showLoadingScreen) setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const [issuesRes, statsRes] = await Promise.all([
        apiClient.get(`/admin/issues?${params}`),
        apiClient.get('/admin/stats')
      ]);

      if (issuesRes.data.success) {
        setIssues(issuesRes.data.data);
        setUserRole(issuesRes.data.userRole); // Capture the role
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
        setDepartmentScope(statsRes.data.data.departmentScope); // Capture the scope
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        showError('Admin access required.');
        navigate('/');
      }
    } finally {
      if (showLoadingScreen) setLoading(false);
    }
  };

  const loadCachedInsights = () => {
    const cached = localStorage.getItem('civic_ai_insights');
    if (cached) setAiInsights(JSON.parse(cached));
  };

  const fetchAIInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await apiClient.get('/admin/ai-insights');
      const result = response.data.data || response.data;

      if (result.success === false) {
        showError("AI Error: " + result.error);
      } else {
        const insightsData = result.summary ? result : result.data;
        setAiInsights(insightsData);
        localStorage.setItem('civic_ai_insights', JSON.stringify(insightsData));
        showSuccess("AI Analysis Updated!");
      }
    } catch (error) {
      showError('Failed to connect to AI Service. Main Admin access required.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      const response = await apiClient.patch(`/admin/issues/${issueId}/status`, { status: newStatus });
      if (response.data.success) {
        fetchData(false);
        showSuccess(`Status updated to ${newStatus}`);
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleResolve = async (issueId) => {
    if (!resolveData.resolved_image_url) {
      showWarning('Please provide the resolved image URL (upload a photo or paste a link)');
      return;
    }
    try {
      setResolving(true);
      const response = await apiClient.post(`/admin/issues/${issueId}/resolve`, resolveData);
      if (response.data.success) {
        showSuccess('Issue resolved! Citizen notified.');
        setSelectedIssue(null);
        setResolveData({ resolution_notes: '', resolved_image_url: '' });
        fetchData(false);
        if (userRole === 'admin') fetchAIInsights(); 
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to resolve issue.');
    } finally {
      setResolving(false);
    }
  };

  const handleAdminImageUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showWarning('Image must be less than 5MB');
      return;
    }
    try {
      setUploadingAdminImage(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const apiKey = process.env.REACT_APP_IMGBB_API_KEY;
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.success) {
        setResolveData({ ...resolveData, resolved_image_url: data.data.url });
        showSuccess('Image uploaded successfully!');
      } else {
        showError('Upload failed.');
      }
    } catch (error) {
      showError('Upload failed: ' + error.message);
    } finally {
      setUploadingAdminImage(false);
    }
  };

  const handleFollowUpEmails = async () => {
    if (window.confirm('Send follow-up emails to all pending issues?')) {
      try {
        const response = await apiClient.post('/admin/trigger-followups');
        if (response.data.success) showSuccess('Follow-up emails sent! Check backend terminal.');
      } catch (error) {
        showError('Failed: ' + error.response?.data?.error);
      }
    }
  };

  const getPriorityColor = (score) => {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  };

  if (loading) return <div className="admin-loading">Loading Dashboard...</div>;

  return (
    <div className="admin-container">
      
      {/* HEADER */}
      <div className="glass-card admin-header">
        <div>
          <h1 className="admin-title">
            {userRole === 'admin' ? 'Main Admin Center' : 'Department Admin'}
          </h1>
          <p className="admin-subtitle">
            Civic Issue Management 
            {departmentScope === 'department' && ' — Departmental View'}
          </p>
        </div>
        <div className="admin-header-actions">
          {/* ONLY Main Admins see the Analytics Button */}
          {userRole === 'admin' && (
            <div className="admin-button-group">
            <button onClick={() => navigate('/admin/manage-dept-admins')} className="glass-button glass-button-primary">
                ≡ Manage Dept Admins
              </button>
            <button onClick={() => navigate('/admin/analytics')} className="glass-button glass-button-primary">
              ◈ Advanced Analytics
            </button>
            </div>
          )}
          <button onClick={() => navigate('/')} className="glass-button glass-button-secondary">◆ Back Home</button>
        </div>
      </div>

      {/* ONLY Main Admins see the AI Insights */}
      {userRole === 'admin' && (
        <div style={styles.aiInsightsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#6f42c1' }}>◇ AI Predictive Insights</h3>
            <button onClick={fetchAIInsights} style={styles.refreshButton}>
              {loadingInsights ? '↻ Analyzing...' : '↪ Refresh Analysis'}
            </button>
          </div>

          {loadingInsights ? (
            <p style={{ color: '#666' }}>Scanning database and generating predictions...</p>
          ) : aiInsights ? (
            <>
              <div style={styles.aiSummary}><strong>≡ System Health:</strong> {aiInsights.summary}</div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h4 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>! Critical Alerts</h4>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {aiInsights.criticalAlerts?.map((alert, i) => <li key={i} style={{ marginBottom: '5px' }}>{alert}</li>)}
                  </ul>
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h4 style={{ color: '#007bff', margin: '0 0 10px 0' }}>◈ Predictions</h4>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {aiInsights.predictiveInsights?.map((pred, i) => <li key={i} style={{ marginBottom: '5px' }}>{pred}</li>)}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: '#666' }}>Click "Refresh Analysis" to generate insights.</p>
          )}
        </div>
      )}

      {/* STATS */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card border-top-blue">
            <div className="admin-stat-value">{stats.overview.total}</div>
            <div className="admin-stat-label">Total Issues</div>
          </div>
          <div className="admin-stat-card border-top-yellow">
            <div className="admin-stat-value">{stats.overview.pending}</div>
            <div className="admin-stat-label">Pending</div>
          </div>
          <div className="admin-stat-card border-top-teal">
            <div className="admin-stat-value">{stats.overview.in_progress}</div>
            <div className="admin-stat-label">In Progress</div>
          </div>
          <div className="admin-stat-card border-top-green">
            <div className="admin-stat-value">{stats.overview.resolved}</div>
            <div className="admin-stat-label">Resolved</div>
          </div>
        </div>
      )}

      {/* FILTER BAR & AUTOMATED CRON BUTTON */}
      <div className="admin-filter-bar">
        <h3 className="admin-filter-title">◈ Issue Queue</h3>
        <div className="admin-filters">
          
          {/* ONLY Main Admins see the Follow-up Trigger */}
          {userRole === 'admin' && (
            <button 
              onClick={handleFollowUpEmails}
              className="glass-button glass-button-danger"
            >
              ◎ Send Follow-Ups (Test)
            </button>
          )}

          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="glass-select">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <button onClick={() => fetchData(true)} className="glass-button glass-button-secondary">↻ Refresh Queue</button>
        </div>
      </div>

      {/* ISSUES LIST */}
      <div className="admin-issues-container">
        {issues.length === 0 ? (
          <div className="admin-no-issues">No issues found for your department.</div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="admin-issue-card">
              <div className="admin-issue-card-header">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <strong>#{issue.id}</strong>
                  <span className="admin-category-tag">{issue.category}</span>
                  <span className="admin-badge" style={{ backgroundColor: getPriorityColor(issue.priority_score) }}>
                    Priority: {issue.priority_score}/10
                  </span>
                  <span className="admin-badge" style={{ backgroundColor: '#6c757d' }}>{issue.status}</span>
                </div>
              </div>
              
              <div className="admin-issue-content">
                <p className="admin-issue-description">{issue.description}</p>
                <div className="admin-issue-details">◆ {issue.location_address} | ◈ {issue.citizen_name || 'Citizen'}</div>
                
                {/* BEFORE AND AFTER PHOTO GALLERY */}
                <div className="admin-photo-gallery">
                  {issue.image_url && (
                    <div className="admin-photo-box admin-photo-before">
                      <p className="admin-photo-label">◆ BEFORE (Reported):</p>
                      <img src={issue.image_url} alt="Citizen Evidence" className="admin-photo-image" onClick={() => window.open(issue.image_url, '_blank')} />
                    </div>
                  )}

                  {issue.resolved_image_url && (
                    <div className="admin-photo-box admin-photo-after">
                      <p className="admin-photo-label">✓ AFTER (Resolved):</p>
                      <img src={issue.resolved_image_url} alt="Resolution Evidence" className="admin-photo-image" onClick={() => window.open(issue.resolved_image_url, '_blank')} />
                      {issue.resolution_notes && <p className="admin-photo-notes"><strong>Notes:</strong> {issue.resolution_notes}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-action-buttons">
                {issue.status === 'Pending' && <button onClick={() => handleStatusUpdate(issue.id, 'Acknowledged')} className="glass-button glass-button-info">◎ Acknowledge</button>}
                {issue.status === 'Acknowledged' && <button onClick={() => handleStatusUpdate(issue.id, 'In Progress')} className="glass-button glass-button-primary">◆ Mark In Progress</button>}
                {issue.status !== 'Resolved' && issue.status !== 'Closed' && <button onClick={() => setSelectedIssue(issue)} className="glass-button glass-button-success">✓ Resolve Issue</button>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* RESOLVE MODAL */}
      {selectedIssue && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3 className="admin-modal-title">✓ Resolve Issue #{selectedIssue.id}</h3>
            
            <div className="admin-form-section">
              <label className="admin-form-label">◆ Upload Resolution Proof <span className="admin-required">*</span></label>
              <input type="file" accept="image/*" disabled={uploadingAdminImage} onChange={(e) => handleAdminImageUpload(e.target.files[0])} className="admin-file-input" />
              {uploadingAdminImage && <small className="admin-loading-text">↻ Uploading to server...</small>}
              
              <div className="admin-url-section">
                <small className="admin-url-label">Or paste URL manually:</small>
                <input type="text" placeholder="https://i.ibb.co/..." value={resolveData.resolved_image_url} onChange={(e) => setResolveData({...resolveData, resolved_image_url: e.target.value})} className="admin-text-input" />
              </div>

              {resolveData.resolved_image_url && (
                <div className="admin-preview-container">
                   <img src={resolveData.resolved_image_url} alt="Resolved Preview" className="admin-preview-image" />
                </div>
              )}
            </div>

            <div className="admin-form-section">
              <label className="admin-form-label">◈ Resolution Notes</label>
              <textarea placeholder="Describe what was done to fix this issue..." value={resolveData.resolution_notes} onChange={(e) => setResolveData({...resolveData, resolution_notes: e.target.value})} className="admin-textarea" rows={3} />
            </div>

            <div className="admin-modal-actions">
              <button onClick={() => { setSelectedIssue(null); setResolveData({ resolution_notes: '', resolved_image_url: '' }); }} className="glass-button glass-button-secondary">Cancel</button>
              <button onClick={() => handleResolve(selectedIssue.id)} disabled={resolving || uploadingAdminImage} className="glass-button glass-button-success">{resolving ? '↻ Resolving...' : '✓ Confirm Resolution'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f4f6f9', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  headerTitle: { margin: 0, color: '#333' },
  headerSubtitle: { margin: 0, color: '#666' },
  backButton: { padding: '8px 16px', backgroundColor: '#343a40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  aiInsightsSection: { backgroundColor: '#f8f9fe', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5f2', marginBottom: '20px' },
  aiSummary: { backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #6f42c1' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' },
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: '13px', color: '#666', marginTop: '5px' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  filters: { display: 'flex', gap: '10px' },
  filterSelect: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' },
  refreshButton: { padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  issuesContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
  noIssues: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '8px', color: '#dc3545', fontWeight: 'bold' },
  issueCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  issueCardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  categoryTag: { backgroundColor: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#333' },
  badge: { color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  actionButtons: { display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', flexWrap: 'wrap' },
  btn: { padding: '6px 12px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
};

export default AdminDashboard;
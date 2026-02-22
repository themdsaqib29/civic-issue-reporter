import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  
  // Modal State
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveData, setResolveData] = useState({ resolution_notes: '', resolved_image_url: '' });
  const [resolving, setResolving] = useState(false);
  const [uploadingAdminImage, setUploadingAdminImage] = useState(false);
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const navigate = useNavigate();

  // ONLY fetch raw data on load/filter change. Do NOT auto-fetch AI.
  useEffect(() => {
    fetchData();
    loadCachedInsights(); 
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
      console.error("Dashboard Fetch Error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        alert('Admin access required.');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Load from Browser Memory (Free & Instant)
  const loadCachedInsights = () => {
    const cached = localStorage.getItem('civic_ai_insights');
    if (cached) {
      setAiInsights(JSON.parse(cached));
    }
  };

  // 2. Fetch Fresh Data from Gemini (Only on button click)
  const fetchAIInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await apiClient.get('/admin/ai-insights');
      const result = response.data.data || response.data;

      if (result.success === false) {
        console.error("Backend AI Error:", result.error);
        alert("⚠️ AI Error: " + result.error);
      } else {
        const insightsData = result.summary ? result : result.data;
        setAiInsights(insightsData);
        // Save to browser memory
        localStorage.setItem('civic_ai_insights', JSON.stringify(insightsData));
        alert("✅ AI Analysis Updated & Cached!");
      }
    } catch (error) {
      console.error('AI Insights API Error:', error);
      alert('Failed to connect to AI Service.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      const response = await apiClient.patch(`/admin/issues/${issueId}/status`, { status: newStatus });
      if (response.data.success) {
        fetchData();
        alert(`✅ Status updated to ${newStatus}`);
      }
    } catch (error) {
      alert('Failed to update status.');
    }
  };

  const handleResolve = async (issueId) => {
    if (!resolveData.resolved_image_url) {
      alert('Please provide the resolved image URL (upload a photo or paste a link)');
      return;
    }
    try {
      setResolving(true);
      const response = await apiClient.post(`/admin/issues/${issueId}/resolve`, resolveData);
      if (response.data.success) {
        alert('✅ Issue resolved! Citizen notified.');
        setSelectedIssue(null);
        setResolveData({ resolution_notes: '', resolved_image_url: '' });
        fetchData();
        // Force an AI refresh when a ticket is resolved so the predictions stay accurate
        fetchAIInsights(); 
      }
    } catch (error) {
      alert('Failed to resolve issue.');
    } finally {
      setResolving(false);
    }
  };

  const handleAdminImageUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }
    
    try {
      setUploadingAdminImage(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const apiKey = process.env.REACT_APP_IMGBB_API_KEY;
      if (!apiKey) {
          alert('Error: ImgBB API key is missing from frontend .env');
          return;
      }

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResolveData({ ...resolveData, resolved_image_url: data.data.url });
        alert('✅ Image uploaded successfully!');
      } else {
        alert('❌ Upload failed.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadingAdminImage(false);
    }
  };

  const getPriorityColor = (score) => {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Dashboard...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🛡️ Admin Command Center</h1>
          <p style={styles.headerSubtitle}>Chennai Civic Issue Management</p>
        </div>
        <button onClick={() => navigate('/')} style={styles.backButton}>← Back</button>
      </div>

      <div style={styles.aiInsightsSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#6f42c1' }}>✨ Gemini AI Predictive Insights</h3>
          <button onClick={fetchAIInsights} style={styles.refreshButton}>
            {loadingInsights ? '🧠 AI is Analyzing...' : '🔄 Refresh AI Analysis'}
          </button>
        </div>

        {loadingInsights ? (
          <p style={{ color: '#666' }}>Scanning database and generating predictions...</p>
        ) : aiInsights ? (
          <>
            <div style={styles.aiSummary}><strong>📊 System Health:</strong> {aiInsights.summary}</div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>🚨 Critical Alerts</h4>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  {aiInsights.criticalAlerts?.map((alert, i) => <li key={i} style={{ marginBottom: '5px' }}>{alert}</li>)}
                </ul>
              </div>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ color: '#007bff', margin: '0 0 10px 0' }}>🔮 AI Predictions</h4>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  {aiInsights.predictiveInsights?.map((pred, i) => <li key={i} style={{ marginBottom: '5px' }}>{pred}</li>)}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: '#666' }}>Click "Refresh AI Analysis" to generate insights.</p>
        )}
      </div>

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
        </div>
      )}

      <div style={styles.filterBar}>
        <h3 style={{ margin: 0 }}>📋 Issue Queue</h3>
        <div style={styles.filters}>
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} style={styles.filterSelect}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <button onClick={fetchData} style={styles.refreshButton}>🔄 Refresh Queue</button>
        </div>
      </div>

      <div style={styles.issuesContainer}>
        {issues.length === 0 ? (
          <div style={styles.noIssues}>No issues found.</div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} style={styles.issueCard}>
              <div style={styles.issueCardHeader}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <strong>#{issue.id}</strong>
                  <span style={styles.categoryTag}>{issue.category}</span>
                  <span style={{ ...styles.badge, backgroundColor: getPriorityColor(issue.priority_score) }}>
                    Priority: {issue.priority_score}/10
                  </span>
                  <span style={{ ...styles.badge, backgroundColor: '#6c757d' }}>{issue.status}</span>
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '15px', fontWeight: '500' }}>{issue.description}</p>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>📍 {issue.location_address} | 👤 {issue.citizen_name || 'Citizen'}</div>
                
                {/* 📸 BEFORE AND AFTER PHOTO GALLERY */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
                  
                  {/* BEFORE PHOTO (Citizen) */}
                  {issue.image_url && (
                    <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffeeba' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>📸 BEFORE (Reported):</p>
                      <img 
                        src={issue.image_url} 
                        alt="Citizen Evidence" 
                        style={{ maxWidth: '200px', maxHeight: '130px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', objectFit: 'cover' }}
                        onClick={() => window.open(issue.image_url, '_blank')}
                      />
                    </div>
                  )}

                  {/* AFTER PHOTO (Admin) */}
                  {issue.resolved_image_url && (
                    <div style={{ padding: '10px', backgroundColor: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#155724' }}>✅ AFTER (Resolved):</p>
                      <img 
                        src={issue.resolved_image_url} 
                        alt="Resolution Evidence" 
                        style={{ maxWidth: '200px', maxHeight: '130px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', objectFit: 'cover' }}
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
              </div>

              <div style={styles.actionButtons}>
                {issue.status === 'Pending' && <button onClick={() => handleStatusUpdate(issue.id, 'Acknowledged')} style={{...styles.btn, backgroundColor: '#17a2b8'}}>👁️ Acknowledge</button>}
                {issue.status === 'Acknowledged' && <button onClick={() => handleStatusUpdate(issue.id, 'In Progress')} style={{...styles.btn, backgroundColor: '#007bff'}}>🔧 Mark In Progress</button>}
                {issue.status !== 'Resolved' && issue.status !== 'Closed' && <button onClick={() => setSelectedIssue(issue)} style={{...styles.btn, backgroundColor: '#28a745'}}>✅ Resolve Issue</button>}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedIssue && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>✅ Resolve Issue #{selectedIssue.id}</h3>
            
            <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📸 Upload Resolution Proof <span style={{color: 'red'}}>*</span></label>
              <input 
                type="file" 
                accept="image/*"
                disabled={uploadingAdminImage}
                onChange={(e) => handleAdminImageUpload(e.target.files[0])}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
              />
              {uploadingAdminImage && <small style={{ color: '#007bff', display: 'block', marginTop: '5px' }}>Uploading to server...</small>}
              
              <div style={{ marginTop: '10px' }}>
                <small style={{ color: '#666', display: 'block', marginBottom: '3px' }}>Or paste URL manually:</small>
                <input 
                  type="text" 
                  placeholder="https://i.ibb.co/..." 
                  value={resolveData.resolved_image_url} 
                  onChange={(e) => setResolveData({...resolveData, resolved_image_url: e.target.value})} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                />
              </div>

              {resolveData.resolved_image_url && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                   <img src={resolveData.resolved_image_url} alt="Resolved Preview" style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid #28a745' }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📝 Resolution Notes</label>
              <textarea 
                placeholder="Describe what was done to fix this issue..." 
                value={resolveData.resolution_notes} 
                onChange={(e) => setResolveData({...resolveData, resolution_notes: e.target.value})} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit' }} 
                rows={3} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSelectedIssue(null); setResolveData({ resolution_notes: '', resolved_image_url: '' }); }} style={{...styles.btn, backgroundColor: '#6c757d'}}>Cancel</button>
              <button onClick={() => handleResolve(selectedIssue.id)} disabled={resolving || uploadingAdminImage} style={{...styles.btn, backgroundColor: '#28a745'}}>{resolving ? 'Resolving...' : 'Confirm Resolution'}</button>
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
  issueCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  issueCardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  categoryTag: { backgroundColor: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#333' },
  badge: { color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  actionButtons: { display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', flexWrap: 'wrap' },
  btn: { padding: '6px 12px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
};

export default AdminDashboard;
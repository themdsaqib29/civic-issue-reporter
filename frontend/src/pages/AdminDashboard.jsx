import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import apiClient from '../services/apiClient';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

  // Hotspot Detection State
  const [hotspots, setHotspots] = useState([]);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const hotspotsLayerGroup = useRef(null);

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

  // HOTSPOT DETECTION FUNCTIONS
  const fetchHotspots = async () => {
    try {
      setLoadingHotspots(true);
      const response = await apiClient.get('/admin/hotspots');
      if (response.data.success) {
        setHotspots(response.data.data);
        showSuccess(`Detected ${response.data.totalHotspots} hotspots with ${response.data.totalIssuesInHotspots} issues`);
        setShowHotspots(true);
      }
    } catch (error) {
      showError('Failed to detect hotspots: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingHotspots(false);
    }
  };

  const initializeMap = useCallback(() => {
    // Initialize map if not already done
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    // Clear existing hotspot layers
    if (hotspotsLayerGroup.current) {
      mapInstance.current.removeLayer(hotspotsLayerGroup.current);
    }
    hotspotsLayerGroup.current = L.layerGroup().addTo(mapInstance.current);

    // Add hotspot circles and markers
    hotspots.forEach((hotspot) => {
      const { center, issueCount, hotspotId, issues } = hotspot;
      
      // Color intensity based on issue count
      const maxCount = Math.max(...hotspots.map(h => h.issueCount), 1);
      const intensity = issueCount / maxCount;
      const color = `hsl(0, 100%, ${100 - intensity * 50}%)`;
      
      // Draw circle for hotspot
      L.circle([center.lat, center.lng], {
        color: color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: 0.3,
        radius: 500, // 500 meters
        dashArray: '5, 5'
      })
        .bindPopup(`
          <div style="font-size: 12px; width: 200px;">
            <strong>🔥 Hotspot #${hotspotId}</strong><br/>
            <span style="color: #666;">${issueCount} issues clustered here</span><br/>
            <span style="font-size: 11px; color: #999;">Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}</span>
          </div>
        `)
        .addTo(hotspotsLayerGroup.current);

      // Add center marker
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          html: `<div style="
            background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
            color: white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">🔥</div>`,
          className: 'hotspot-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -10]
        })
      })
        .bindPopup(`
          <div style="font-size: 12px; min-width: 250px; max-height: 300px; overflow-y: auto;">
            <strong style="font-size: 14px;">🔥 Hotspot #${hotspotId}</strong><br/>
            <span style="color: #666; font-size: 13px;">${issueCount} Issues Detected</span><br/>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;"/>
            <strong style="font-size: 12px;">Issues in this area:</strong><br/>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 11px;">
              ${issues.slice(0, 5).map(issue => `
                <li style="margin-bottom: 4px;">
                  <strong>#${issue.id}</strong> - ${issue.category}<br/>
                  <span style="color: #999;">${issue.description.substring(0, 40)}...</span>
                </li>
              `).join('')}
              ${issues.length > 5 ? `<li style="color: #999; font-style: italic;">+${issues.length - 5} more...</li>` : ''}
            </ul>
          </div>
        `)
        .addTo(hotspotsLayerGroup.current);

      // Add issue pins within hotspot
      issues.forEach((issue) => {
        L.marker([parseFloat(issue.location_lat), parseFloat(issue.location_lng)], {
          icon: L.divIcon({
            html: `<div style="
              background: white;
              border: 3px solid #ff6b6b;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
            ">${issue.priority_score}</div>`,
            className: 'issue-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
          })
        })
          .bindPopup(`
            <div style="font-size: 11px; width: 200px;">
              <strong>#${issue.id} - ${issue.category}</strong><br/>
              <span>${issue.description.substring(0, 60)}...</span><br/>
              <span style="color: #999;">Priority: ${issue.priority_score}/10</span>
            </div>
          `)
          .addTo(hotspotsLayerGroup.current);
      });
    });

    // Fit all hotspots in view
    if (hotspots.length > 0) {
      const bounds = L.latLngBounds(
        hotspots.map(h => [h.center.lat, h.center.lng])
      );
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotspots]);

  useEffect(() => {
    if (showHotspots && mapRef.current) {
      initializeMap();
    }
  }, [showHotspots, initializeMap]);

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
            <button onClick={fetchHotspots} disabled={loadingHotspots} className="glass-button glass-button-primary">
              {loadingHotspots ? '↻ Loading...' : 'Geographic Hotspots'}
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

      {/* HOTSPOT DETECTION MAP */}
      {showHotspots && userRole === 'admin' && (
        <div className="hotspot-section glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#ff6b6b' }}>🔥 Geographic Hotspot Analysis</h3>
            <button 
              onClick={() => setShowHotspots(false)} 
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ marginBottom: '10px', fontSize: '13px', color: '#666' }}>
            <strong>{hotspots.length}</strong> hotspots detected with <strong>{hotspots.reduce((sum, h) => sum + h.issueCount, 0)}</strong> clustered issues
          </div>

          <div 
            ref={mapRef} 
            style={{
              width: '100%',
              height: '500px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              overflow: 'hidden'
            }}
          />

          <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255, 107, 107, 0.05)', borderRadius: '8px' }}>
            <strong style={{ color: '#ff6b6b', fontSize: '13px' }}>ℹ️ How to interpret:</strong>
            <ul style={{ margin: '8px 0 0 20px', fontSize: '12px', color: '#666' }}>
              <li>🔴 <strong>Red circles</strong> = Geographic hotspots (ε=500m, minPts=3)</li>
              <li>🔥 <strong>Flame markers</strong> = Hotspot center point</li>
              <li>🔵 <strong>Small numbered circles</strong> = Individual issues (number = priority score)</li>
              <li><strong>Darker red</strong> = More issues in that area</li>
            </ul>
          </div>
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
                  <span 
                    className="admin-badge admin-status-badge" 
                    data-status={issue.status}
                  >
                    {issue.status === 'Pending' ? '→' : issue.status === 'In Progress' ? '◆' : '✓'} {issue.status}
                  </span>
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
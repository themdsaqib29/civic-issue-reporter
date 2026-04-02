import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import apiClient from '../services/apiClient';
import './ManageDeptAdmins.css';

function ManageDeptAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Departments List (Based on your database dump)
  const departments = [
    { id: 1, name: 'Roads Department - Zone 1 (North)' },
    { id: 2, name: 'Roads Department - Zone 2 (Central)' },
    { id: 3, name: 'Electrical Department - Zone 1 (North)' },
    { id: 4, name: 'Electrical Department - Zone 2 (Central)' },
    { id: 5, name: 'Solid Waste Management - Zone 1 (North)' },
    { id: 6, name: 'Solid Waste Management - Zone 2 (Central)' },
    { id: 7, name: 'Water Supply - Zone 1 (North)' },
    { id: 8, name: 'Water Supply - Zone 2 (Central)' },
    { id: 9, name: 'Storm Water Drain Department (All Zones)' },
    { id: 10, name: 'Health Department (All Zones)' },
    { id: 11, name: 'Roads Department - Zone 3 (South)' },
    { id: 12, name: 'Electrical Department - Zone 3 (South)' },
    { id: 13, name: 'Solid Waste Management - Zone 3 (South)' },
    { id: 14, name: 'Water Supply - Zone 3 (South)' }
  ];

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await apiClient.get('/admin/dept-admins');
      if (response.data.success) {
        setAdmins(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      showError('Failed to load admins. Main Admin access required.');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.department_id) {
      showWarning("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);
      const response = await apiClient.post('/admin/dept-admins', formData);
      if (response.data.success) {
        showSuccess('Department Admin created successfully!');
        setFormData({ name: '', email: '', password: '', department_id: '' }); // Reset form
        fetchAdmins(); // Refresh the list
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="manage-admins-loading">↻ Loading Admin Roster...</div>;

  return (
    <div className="manage-admins-container">
      
      {/* Header */}
      <div className="manage-admins-header glass-card">
        <div>
          <h1 className="manage-admins-title">≡ Manage Department Admins</h1>
          <p className="manage-admins-subtitle">Create and view sub-admin accounts</p>
        </div>
        <button onClick={() => navigate('/admin')} className="glass-button glass-button-secondary">
          ← Back to Command Center
        </button>
      </div>

      <div className="manage-admins-content">
        
        {/* CREATE NEW ADMIN FORM */}
        <div className="manage-admins-form-section">
          <h3 className="manage-admins-form-title">▲ Register New Sub-Admin</h3>
          <form onSubmit={handleSubmit} className="manage-admins-form">
            
            <div className="manage-admins-form-group">
              <label className="manage-admins-form-label">Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="manage-admins-form-input" placeholder="Name" required />
            </div>

            <div className="manage-admins-form-group">
              <label className="manage-admins-form-label">Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="manage-admins-form-input" placeholder="e.g., water.zone@gcc.gov.in" required />
            </div>

            <div className="manage-admins-form-group">
              <label className="manage-admins-form-label">Password</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="manage-admins-form-input" placeholder="Enter a secure password" required />
            </div>

            <div className="manage-admins-form-group">
              <label className="manage-admins-form-label">Assign Department</label>
              <select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="manage-admins-form-select" required>
                <option value="">-- Select a Department --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={creating} className="glass-button glass-button-success manage-admins-submit-btn">
              {creating ? '↻ Creating...' : '✓ Create Account'}
            </button>
          </form>
        </div>

        {/* EXISTING ADMINS LIST */}
        <div className="manage-admins-list-section">
          <h3 className="manage-admins-list-title">◈ Active Department Admins</h3>
          
          {admins.length === 0 ? (
            <p className="manage-admins-empty">No department admins created yet.</p>
          ) : (
            <div className="manage-admins-grid">
              {admins.map(admin => (
                <div key={admin.id} className="manage-admins-admin-card">
                  <div className="manage-admins-card-header">
                    <div>
                      <strong className="manage-admins-admin-name">{admin.name}</strong>
                      <div className="manage-admins-admin-email">◎ {admin.email}</div>
                    </div>
                    <span className="manage-admins-dept-badge">
                      {admin.department_category}
                    </span>
                  </div>
                  <div className="manage-admins-department-info">
                    ◆ <strong>Assigned to:</strong> {admin.department_name} (ID: {admin.department_id})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ManageDeptAdmins;
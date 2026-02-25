import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function ManageDeptAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      alert('Failed to load admins. Main Admin access required.');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.department_id) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);
      const response = await apiClient.post('/admin/dept-admins', formData);
      if (response.data.success) {
        alert('✅ Department Admin created successfully!');
        setFormData({ name: '', email: '', password: '', department_id: '' }); // Reset form
        fetchAdmins(); // Refresh the list
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Admin Roster...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>👥 Manage Department Admins</h1>
          <p style={{ margin: 0, color: '#666' }}>Create and view sub-admin accounts</p>
        </div>
        <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', backgroundColor: '#343a40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ← Back to Command Center
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* CREATE NEW ADMIN FORM */}
        <div style={{ flex: '1', minWidth: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>➕ Register New Sub-Admin</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Name" required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g., water.zone@gcc.gov.in" required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Password</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Enter a secure password" required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Assign Department</label>
              <select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required>
                <option value="">-- Select a Department --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={creating} style={{ padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: creating ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* EXISTING ADMINS LIST */}
        <div style={{ flex: '2', minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📋 Active Department Admins</h3>
          
          {admins.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No department admins created yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {admins.map(admin => (
                <div key={admin.id} style={{ padding: '15px', border: '1px solid #e1e5f2', borderRadius: '6px', backgroundColor: '#f8f9fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: '#333' }}>{admin.name}</strong>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>📧 {admin.email}</div>
                    </div>
                    <span style={{ backgroundColor: '#007bff', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {admin.department_category}
                    </span>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#555', backgroundColor: '#e9ecef', padding: '6px 10px', borderRadius: '4px', display: 'inline-block' }}>
                    🏢 <strong>Assigned to:</strong> {admin.department_name} (ID: {admin.department_id})
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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Required for the map to render correctly
import apiClient from '../services/apiClient';

function AnalyticsDashboard() {
  const [data, setData] = useState({ categoryData: [], statusData: [], geoData: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Colors for the Pie Chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/admin/enhanced-analytics');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      alert('Failed to load analytics. Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to color the map markers based on priority
  const getMarkerColor = (score) => {
    if (score >= 7) return '#dc3545'; // Red (High Priority)
    if (score >= 4) return '#ffc107'; // Yellow (Medium)
    return '#28a745'; // Green (Low)
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '20px' }}>Loading Big Data Analytics...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>📈 Advanced Analytics & Heatmap</h1>
          <p style={{ margin: 0, color: '#666' }}>City-wide infrastructure data visualization</p>
        </div>
        <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', backgroundColor: '#343a40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ← Back to Command Center
        </button>
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        
        {/* BAR CHART: Trending Categories */}
        <div style={{ flex: '2', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minWidth: '400px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>📊 Trending Issues by Category</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#007bff" name="Total Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: Status Breakdown */}
        <div style={{ flex: '1', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minWidth: '300px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🔄 Resolution Status</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="count" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* LIVE MAP / HEATMAP SECTION */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🗺️ Live Geographic Incident Map</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Visualizing {data.geoData.length} coordinate points. <span style={{color: '#dc3545', fontWeight: 'bold'}}>Red</span> = Critical, <span style={{color: '#ffc107', fontWeight: 'bold'}}>Yellow</span> = Medium, <span style={{color: '#28a745', fontWeight: 'bold'}}>Green</span> = Low.
        </p>
        
        {/* Leaflet Map Container */}
        <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
          <MapContainer center={[13.0827, 80.2707]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Plot every issue as a colored dot */}
            {data.geoData.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.location_lat, point.location_lng]}
                radius={8 + (point.priority_score || 1)} // Higher priority = bigger dot
                fillColor={getMarkerColor(point.priority_score)}
                fillOpacity={0.7}
                color="white"
                weight={1}
              >
                <Popup>
                  <strong>#{point.id}: {point.category}</strong><br/>
                  Priority: {point.priority_score}/10<br/>
                  Status: {point.status}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

    </div>
  );
}

export default AnalyticsDashboard;
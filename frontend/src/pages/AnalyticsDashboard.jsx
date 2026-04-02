import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Required for the map to render correctly
import apiClient from '../services/apiClient';
import './AnalyticsDashboard.css';

function AnalyticsDashboard() {
  const [data, setData] = useState({ categoryData: [], statusData: [], geoData: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showError } = useToast();

  // Colors for the Pie Chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/admin/enhanced-analytics');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      showError('Failed to load analytics. Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to color the map markers based on priority
  const getMarkerColor = (score) => {
    if (score >= 7) return '#dc3545'; // Red (High Priority)
    if (score >= 4) return '#ffc107'; // Yellow (Medium)
    return '#28a745'; // Green (Low)
  };

  if (loading) return <div className="analytics-loading">↻ Loading Big Data Analytics...</div>;

  return (
    <div className="analytics-container">
      
      {/* HEADER */}
      <div className="analytics-header glass-card">
        <div>
          <h1 className="analytics-title">◈ Advanced Analytics & Heatmap</h1>
          <p className="analytics-subtitle">City-wide infrastructure data visualization</p>
        </div>
        <button onClick={() => navigate('/admin')} className="glass-button glass-button-secondary">
          ← Back to Command Center
        </button>
      </div>

      {/* CHARTS ROW */}
      <div className="analytics-charts-grid">
        
        {/* BAR CHART: Trending Categories */}
        <div className="analytics-chart-container">
          <h3>◈ Trending Issues by Category</h3>
          <div className="analytics-chart-height">
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
        <div className="analytics-chart-container analytics-chart-small">
          <h3>◆ Resolution Status</h3>
          <div className="analytics-chart-height">
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
      <div className="analytics-map-section glass-card">
        <h3>◈ Live Geographic Incident Map</h3>
        <p className="analytics-map-legend">
          Visualizing {data.geoData.length} coordinate points. <span className="legend-critical">Red</span> = Critical, <span className="legend-medium">Yellow</span> = Medium, <span className="legend-low">Green</span> = Low.
        </p>
        
        {/* Leaflet Map Container */}
        <div className="analytics-map-container">
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
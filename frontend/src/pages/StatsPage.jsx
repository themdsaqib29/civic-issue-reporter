import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import './StatsPage.css';

function StatsPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await apiClient.get('/issues');
      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalIssues = issues.length;
  const highPriority = issues.filter(i => i.priority_score >= 7).length;
  const mediumPriority = issues.filter(i => i.priority_score >= 4 && i.priority_score < 7).length;
  const lowPriority = issues.filter(i => i.priority_score < 4).length;

  // Category breakdown
  const categoryStats = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {});

  // Department breakdown
  const departmentStats = issues.reduce((acc, issue) => {
    const dept = issue.department_name || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="stats-loading">Loading...</div>;

  return (
    <div className="stats-container">
      <div className="stats-header glass-card">
        <div>
          <h2 className="stats-title">Analytics Dashboard</h2>
          <p className="stats-subtitle">Community insights and trends</p>
        </div>
        <button onClick={() => navigate('/')} className="glass-button ghost">
          ◆ Back to Home
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-value">{totalIssues}</div>
          <div className="stat-label">Total Issues</div>
        </div>
        
        <div className="stat-card stat-card-red">
          <div className="stat-value">{highPriority}</div>
          <div className="stat-label">High Priority</div>
        </div>
        
        <div className="stat-card stat-card-yellow">
          <div className="stat-value">{mediumPriority}</div>
          <div className="stat-label">Medium Priority</div>
        </div>
        
        <div className="stat-card stat-card-green">
          <div className="stat-value">{lowPriority}</div>
          <div className="stat-label">Low Priority</div>
        </div>
      </div>

      <div className="stats-charts-grid">
        <div className="stats-chart-card">
          <h3>◈ Issues by Category</h3>
          <div className="stats-bar-chart">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} className="stats-bar-row">
                <div className="stats-bar-label">{category}</div>
                <div className="stats-bar-container">
                  <div
                    className="stats-bar"
                    style={{
                      width: `${(count / totalIssues) * 100}%`,
                    }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-chart-card">
          <h3>◈ Issues by Department</h3>
          <div className="stats-bar-chart">
            {Object.entries(departmentStats).map(([dept, count]) => (
              <div key={dept} className="stats-bar-row">
                <div className="stats-bar-label">{dept}</div>
                <div className="stats-bar-container">
                  <div
                    className="stats-bar stats-bar-green"
                    style={{
                      width: `${(count / totalIssues) * 100}%`,
                    }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsPage;
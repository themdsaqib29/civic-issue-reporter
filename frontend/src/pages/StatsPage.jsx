import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

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

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📊 Analytics Dashboard</h2>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Back
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #007bff' }}>
          <div style={styles.statValue}>{totalIssues}</div>
          <div style={styles.statLabel}>Total Issues</div>
        </div>
        
        <div style={{ ...styles.statCard, borderLeft: '4px solid #dc3545' }}>
          <div style={styles.statValue}>{highPriority}</div>
          <div style={styles.statLabel}>High Priority</div>
        </div>
        
        <div style={{ ...styles.statCard, borderLeft: '4px solid #ffc107' }}>
          <div style={styles.statValue}>{mediumPriority}</div>
          <div style={styles.statLabel}>Medium Priority</div>
        </div>
        
        <div style={{ ...styles.statCard, borderLeft: '4px solid #28a745' }}>
          <div style={styles.statValue}>{lowPriority}</div>
          <div style={styles.statLabel}>Low Priority</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3>Issues by Category</h3>
          <div style={styles.barChart}>
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} style={styles.barRow}>
                <div style={styles.barLabel}>{category}</div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
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

        <div style={styles.chartCard}>
          <h3>Issues by Department</h3>
          <div style={styles.barChart}>
            {Object.entries(departmentStats).map(([dept, count]) => (
              <div key={dept} style={styles.barRow}>
                <div style={styles.barLabel}>{dept}</div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(count / totalIssues) * 100}%`,
                      backgroundColor: '#28a745',
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

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '100px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '30px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '10px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  chartCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  barChart: {
    marginTop: '20px',
  },
  barRow: {
    marginBottom: '15px',
  },
  barLabel: {
    fontSize: '14px',
    marginBottom: '5px',
    fontWeight: '500',
  },
  barContainer: {
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    height: '30px',
    position: 'relative',
  },
  bar: {
    backgroundColor: '#007bff',
    height: '100%',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10px',
    color: 'white',
    fontWeight: 'bold',
    minWidth: '40px',
  },
};

export default StatsPage;
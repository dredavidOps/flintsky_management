import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    
    // Refresh data when window regains focus
    const handleFocus = () => {
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [overviewData, maintenanceData] = await Promise.all([
        apiService.getOverview(),
        apiService.getMaintenanceRequests(),
      ]);
      setOverview(overviewData);
      setMaintenanceRequests(maintenanceData);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // Calculate maintenance stats
  const openRequests = maintenanceRequests.filter(r => r.status === 'open').length;
  const closedRequests = maintenanceRequests.filter(r => r.status === 'closed').length;
  const totalRequests = maintenanceRequests.length;

  const stats = [
    { label: 'Total Apartments', value: overview?.total_apartments || 0, icon: '🏢', color: '#3498db' },
    { label: 'Occupied', value: overview?.occupied || 0, icon: '✅', color: '#27ae60' },
    { label: 'Available', value: overview?.available || 0, icon: '🏠', color: '#f39c12' },
    { label: 'Open Maintenance', value: openRequests, icon: '🔧', color: '#e74c3c' },
  ];

  // Get recent maintenance requests (last 5)
  const recentRequests = [...maintenanceRequests]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'status-open';
      case 'closed': return 'status-closed';
      default: return '';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <button className="btn-refresh" onClick={handleRefresh} title="Refresh Data">
          🔄 Refresh
        </button>
      </div>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderTop: `4px solid ${stat.color}` }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>📅 Upcoming Move-ins (Next 7 Days)</h2>
          {overview?.upcoming_move_ins?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Apartment</th>
                  <th>Tenant</th>
                  <th>Move-in Date</th>
                  <th>Move-out Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.upcoming_move_ins.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.apartment}</td>
                    <td>{item.tenant}</td>
                    <td>{item.move_in}</td>
                    <td>{item.move_out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No upcoming move-ins</p>
          )}
        </div>

        <div className="section">
          <h2>📅 Upcoming Move-outs (Next 7 Days)</h2>
          {overview?.upcoming_move_outs?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Apartment</th>
                  <th>Tenant</th>
                  <th>Move-in Date</th>
                  <th>Move-out Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.upcoming_move_outs.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.apartment}</td>
                    <td>{item.tenant}</td>
                    <td>{item.move_in}</td>
                    <td>{item.move_out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No upcoming move-outs</p>
          )}
        </div>
      </div>

      {/* Maintenance Requests Section */}
      <div className="maintenance-section">
        <div className="section maintenance-summary">
          <h2>🔧 Maintenance Overview</h2>
          <div className="maintenance-stats">
            <div className="maintenance-stat">
              <span className="stat-number">{openRequests}</span>
              <span className="stat-label">Open</span>
            </div>
            <div className="maintenance-stat">
              <span className="stat-number">{closedRequests}</span>
              <span className="stat-label">Closed</span>
            </div>
          </div>
        </div>

        <div className="section recent-maintenance">
          <h2>📝 Recent Maintenance Requests</h2>
          {recentRequests.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td className="issue-cell">{request.issue}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No maintenance requests</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

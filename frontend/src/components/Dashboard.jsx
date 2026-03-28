import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const data = await apiService.getOverview();
      setOverview(data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  const stats = [
    { label: 'Total Apartments', value: overview?.total_apartments || 0, icon: '🏢', color: '#3498db' },
    { label: 'Occupied', value: overview?.occupied || 0, icon: '✅', color: '#27ae60' },
    { label: 'Available', value: overview?.available || 0, icon: '🏠', color: '#f39c12' },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard Overview</h1>
      
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
    </div>
  );
};

export default Dashboard;

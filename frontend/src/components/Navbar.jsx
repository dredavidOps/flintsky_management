import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'apartments', label: '🏠 Apartments' },
    { id: 'tenants', label: '👥 Tenants' },
    { id: 'leases', label: '📝 Leases' },
    { id: 'maintenance', label: '🔧 Maintenance' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">🏢</span>
        <span className="brand-text">Flintsky</span>
      </div>
      
      <ul className="nav-menu">
        {navItems.map((item) => (
          <li
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </li>
        ))}
      </ul>
      
      <div className="navbar-user">
        <span className="username">{user?.username || 'Admin'}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

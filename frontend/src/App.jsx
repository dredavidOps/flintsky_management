import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Apartments from './components/Apartments';
import Tenants from './components/Tenants';
import Leases from './components/Leases';
import Maintenance from './components/Maintenance';
import './App.css';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'apartments':
        return <Apartments />;
      case 'tenants':
        return <Tenants />;
      case 'leases':
        return <Leases />;
      case 'maintenance':
        return <Maintenance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

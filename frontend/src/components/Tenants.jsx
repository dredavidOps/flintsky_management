import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import './EntityPage.css';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const data = await apiService.getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await apiService.updateTenant(editingTenant.id, formData);
      } else {
        await apiService.createTenant(formData);
      }
      setModalOpen(false);
      setEditingTenant(null);
      setFormData({ name: '', email: '', phone: '' });
      fetchTenants();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteTenant(id);
      fetchTenants();
    } catch (error) {
      alert('Error deleting tenant: ' + error.message);
    }
  };

  const handleAddNew = () => {
    setEditingTenant(null);
    setFormData({ name: '', email: '', phone: '' });
    setModalOpen(true);
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
  ];

  return (
    <div className="entity-page">
      <div className="page-header">
        <h1>👥 Tenants</h1>
        <button className="btn-primary" onClick={handleAddNew}>
          + Add Tenant
        </button>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTenant ? 'Edit Tenant' : 'Add Tenant'}
      >
        <form onSubmit={handleSubmit} className="entity-form">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., John Doe"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="e.g., john@example.com"
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="e.g., +1 234 567 890"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTenant ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tenants;

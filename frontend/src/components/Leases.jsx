import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import './EntityPage.css';

const Leases = () => {
  const [leases, setLeases] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const [formData, setFormData] = useState({
    apartment_id: '',
    tenant_id: '',
    move_in: '',
    move_out: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leasesData, apartmentsData, tenantsData] = await Promise.all([
        apiService.getLeases(),
        apiService.getApartments(),
        apiService.getTenants(),
      ]);
      setLeases(leasesData);
      setApartments(apartmentsData);
      setTenants(tenantsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getApartmentNumber = (id) => {
    const apt = apartments.find((a) => a.id === id);
    return apt ? apt.number : `ID: ${id}`;
  };

  const getTenantName = (id) => {
    const tenant = tenants.find((t) => t.id === id);
    return tenant ? tenant.name : `ID: ${id}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        apartment_id: parseInt(formData.apartment_id),
        tenant_id: parseInt(formData.tenant_id),
      };
      
      if (editingLease) {
        await apiService.updateLease(editingLease.id, payload);
      } else {
        await apiService.createLease(payload);
      }
      setModalOpen(false);
      setEditingLease(null);
      setFormData({
        apartment_id: '',
        tenant_id: '',
        move_in: '',
        move_out: '',
        is_active: true,
      });
      fetchData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (lease) => {
    setEditingLease(lease);
    setFormData({
      apartment_id: lease.apartment_id,
      tenant_id: lease.tenant_id,
      move_in: lease.move_in,
      move_out: lease.move_out || '',
      is_active: lease.is_active,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteLease(id);
      fetchData();
    } catch (error) {
      alert('Error deleting lease: ' + error.message);
    }
  };

  const handleAddNew = () => {
    setEditingLease(null);
    setFormData({
      apartment_id: '',
      tenant_id: '',
      move_in: '',
      move_out: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const columns = [
    {
      key: 'apartment_id',
      label: 'Apartment',
      render: (value) => getApartmentNumber(value),
    },
    {
      key: 'tenant_id',
      label: 'Tenant',
      render: (value) => getTenantName(value),
    },
    {
      key: 'move_in',
      label: 'Move In',
      render: (value) => formatDate(value),
    },
    {
      key: 'move_out',
      label: 'Move Out',
      render: (value) => formatDate(value),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-${value ? 'active' : 'inactive'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="entity-page">
      <div className="page-header">
        <h1>📝 Leases</h1>
        <button className="btn-primary" onClick={handleAddNew}>
          + Add Lease
        </button>
      </div>

      <DataTable
        columns={columns}
        data={leases}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLease ? 'Edit Lease' : 'Add Lease'}
      >
        <form onSubmit={handleSubmit} className="entity-form">
          <div className="form-group">
            <label>Apartment *</label>
            <select
              value={formData.apartment_id}
              onChange={(e) => setFormData({ ...formData, apartment_id: e.target.value })}
              required
            >
              <option value="">Select Apartment</option>
              {apartments
                .filter((a) => a.status === 'available' || editingLease?.apartment_id === a.id)
                .map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.number} (Floor {apt.floor})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tenant *</label>
            <select
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              required
            >
              <option value="">Select Tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Move-in Date *</label>
            <input
              type="date"
              value={formData.move_in}
              onChange={(e) => setFormData({ ...formData, move_in: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Move-out Date</label>
            <input
              type="date"
              value={formData.move_out}
              onChange={(e) => setFormData({ ...formData, move_out: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active Lease
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLease ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leases;

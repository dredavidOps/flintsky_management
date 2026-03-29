import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import './EntityPage.css';

const Maintenance = () => {
  const [requests, setRequests] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [formData, setFormData] = useState({
    lease_id: '',
    issue: '',
    status: 'open',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsData, leasesData] = await Promise.all([
        apiService.getMaintenanceRequests(),
        apiService.getLeases(),
      ]);
      setRequests(requestsData);
      setLeases(leasesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        lease_id: parseInt(formData.lease_id),
      };
      
      if (editingRequest) {
        await apiService.updateMaintenanceRequest(editingRequest.id, payload);
      } else {
        await apiService.createMaintenanceRequest(payload);
      }
      setModalOpen(false);
      setEditingRequest(null);
      setFormData({
        lease_id: '',
        issue: '',
        status: 'open',
      });
      fetchData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      lease_id: request.lease?.id || '',
      issue: request.issue,
      status: request.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteMaintenanceRequest(id);
      fetchData();
    } catch (error) {
      alert('Error deleting request: ' + error.message);
    }
  };

  const handleAddNew = () => {
    setEditingRequest(null);
    setFormData({
      lease_id: '',
      issue: '',
      status: 'open',
    });
    setModalOpen(true);
  };

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'lease',
      label: 'Lease',
      render: (value) => {
        if (!value) return 'N/A';
        const aptNum = value.apartment?.number || 'N/A';
        const tenantName = value.tenant?.name || 'N/A';
        return `Lease #${value.id} (${aptNum} - ${tenantName})`;
      },
    },
    { key: 'issue', label: 'Issue' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-${value.replace('_', '-')}`}>
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <div className="entity-page">
      <div className="page-header">
        <h1>🔧 Maintenance Requests</h1>
        <button className="btn-primary" onClick={handleAddNew}>
          + Add Request
        </button>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRequest ? 'Edit Maintenance Request' : 'Add Maintenance Request'}
      >
        <form onSubmit={handleSubmit} className="entity-form">
          <div className="form-group">
            <label>Lease *</label>
            <select
              value={formData.lease_id}
              onChange={(e) => setFormData({ ...formData, lease_id: e.target.value })}
              required
            >
              <option value="">Select Lease</option>
              {leases
                .filter((l) => l.is_active || editingRequest?.lease?.id === l.id)
                .map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    Lease #{lease.id} ({lease.apartment?.number || 'N/A'} - {lease.tenant?.name || 'N/A'})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Issue Description *</label>
            <textarea
              value={formData.issue}
              onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              required
              rows="4"
              placeholder="Describe the maintenance issue..."
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingRequest ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Maintenance;

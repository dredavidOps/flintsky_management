import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import './EntityPage.css';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [formData, setFormData] = useState({
    number: '',
    floor: '',
    status: 'available',
    notes: '',
  });

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const data = await apiService.getApartments();
      setApartments(data);
    } catch (error) {
      console.error('Failed to fetch apartments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingApartment) {
        await apiService.updateApartment(editingApartment.id, formData);
      } else {
        await apiService.createApartment(formData);
      }
      setModalOpen(false);
      setEditingApartment(null);
      setFormData({ number: '', floor: '', status: 'available', notes: '' });
      fetchApartments();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (apartment) => {
    setEditingApartment(apartment);
    setFormData({
      number: apartment.number,
      floor: apartment.floor,
      status: apartment.status,
      notes: apartment.notes || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteApartment(id);
      fetchApartments();
    } catch (error) {
      alert('Error deleting apartment: ' + error.message);
    }
  };

  const handleAddNew = () => {
    setEditingApartment(null);
    setFormData({ number: '', floor: '', status: 'available', notes: '' });
    setModalOpen(true);
  };

  const columns = [
    { key: 'number', label: 'Number' },
    { key: 'floor', label: 'Floor' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-${value}`}>{value}</span>
      ),
    },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div className="entity-page">
      <div className="page-header">
        <h1>🏠 Apartments</h1>
        <button className="btn-primary" onClick={handleAddNew}>
          + Add Apartment
        </button>
      </div>

      <DataTable
        columns={columns}
        data={apartments}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingApartment ? 'Edit Apartment' : 'Add Apartment'}
      >
        <form onSubmit={handleSubmit} className="entity-form">
          <div className="form-group">
            <label>Apartment Number *</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              required
              placeholder="e.g., 101A"
            />
          </div>

          <div className="form-group">
            <label>Floor *</label>
            <input
              type="number"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingApartment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Apartments;

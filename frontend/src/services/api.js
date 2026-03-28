const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Auth
  async login(username, password) {
    const data = await this.request('/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.clearToken();
  }

  // Apartments
  getApartments() {
    return this.request('/apartments/');
  }

  getApartment(id) {
    return this.request(`/apartments/${id}/`);
  }

  createApartment(data) {
    return this.request('/apartments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateApartment(id, data) {
    return this.request(`/apartments/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteApartment(id) {
    return this.request(`/apartments/${id}/`, {
      method: 'DELETE',
    });
  }

  // Tenants
  getTenants() {
    return this.request('/tenants/');
  }

  getTenant(id) {
    return this.request(`/tenants/${id}/`);
  }

  createTenant(data) {
    return this.request('/tenants/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTenant(id, data) {
    return this.request(`/tenants/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteTenant(id) {
    return this.request(`/tenants/${id}/`, {
      method: 'DELETE',
    });
  }

  // Leases
  getLeases() {
    return this.request('/leases/');
  }

  getLease(id) {
    return this.request(`/leases/${id}/`);
  }

  createLease(data) {
    return this.request('/leases/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateLease(id, data) {
    return this.request(`/leases/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteLease(id) {
    return this.request(`/leases/${id}/`, {
      method: 'DELETE',
    });
  }

  getUpcomingMoveIns() {
    return this.request('/leases/upcoming-moveins/');
  }

  getUpcomingMoveOuts() {
    return this.request('/leases/upcoming-moveouts/');
  }

  // Maintenance Requests
  getMaintenanceRequests() {
    return this.request('/maintenance-requests/');
  }

  getMaintenanceRequest(id) {
    return this.request(`/maintenance-requests/${id}/`);
  }

  createMaintenanceRequest(data) {
    return this.request('/maintenance-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateMaintenanceRequest(id, data) {
    return this.request(`/maintenance-requests/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteMaintenanceRequest(id) {
    return this.request(`/maintenance-requests/${id}/`, {
      method: 'DELETE',
    });
  }

  // Dashboard
  getOverview() {
    return this.request('/overview/');
  }
}

export const apiService = new ApiService();
export default apiService;

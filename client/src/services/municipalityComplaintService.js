import api from './api';

export const getMunicipalityStatsApi = async () => {
  return await api.get('/municipality/dashboard/stats');
};

export const getMunicipalityComplaintsApi = async (params = {}) => {
  return await api.get('/municipality/complaints', { params });
};

export const getMunicipalityComplaintByIdApi = async (complaintId) => {
  return await api.get(`/municipality/complaints/${complaintId}`);
};

export const updateComplaintStatusApi = async (complaintId, payload) => {
  return await api.patch(`/municipality/complaints/${complaintId}/status`, payload);
};

export const assignComplaintOfficerApi = async (complaintId, payload) => {
  return await api.patch(`/municipality/complaints/${complaintId}/assign`, payload);
};

export const uploadResolutionImageApi = async (complaintId, formData) => {
  return await api.post(`/municipality/complaints/${complaintId}/resolution-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getMunicipalityOfficersApi = async () => {
  return await api.get('/municipality/officers');
};

export const getAdminStatsApi = async (params = {}) => {
  return await api.get('/admin/dashboard/stats', { params });
};

export const getAdminComplaintsApi = async (params = {}) => {
  return await api.get('/admin/complaints', { params });
};

export const getAdminUsersApi = async (params = {}) => {
  return await api.get('/admin/users', { params });
};

export const createAdminUserApi = async (payload) => {
  return await api.post('/admin/users', payload);
};

export const deleteAdminUserApi = async (userId) => {
  return await api.delete(`/admin/users/${userId}`);
};


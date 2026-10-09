import api from './api';

export const createComplaintApi = async (payload) => {
  return await api.post('/complaints', payload);
};

export const getMyComplaintsApi = async (params = {}) => {
  return await api.get('/complaints/my', { params });
};

export const getComplaintByIdApi = async (complaintId) => {
  return await api.get(`/complaints/${complaintId}`);
};

export const updateComplaintApi = async (complaintId, payload) => {
  return await api.put(`/complaints/${complaintId}`, payload);
};

export const deleteComplaintApi = async (complaintId) => {
  return await api.delete(`/complaints/${complaintId}`);
};

export const verifyComplaintImageApi = async (imageUrl, description) => {
  return await api.post('/complaints/verify-image', { imageUrl, description });
};

export const getComplaintHistoryApi = async (complaintId) => {
  return await api.get(`/complaints/${complaintId}/history`);
};

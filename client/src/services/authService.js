import api from './api';

export const registerApi = async (userData) => {
  return await api.post('/auth/register', userData);
};

export const loginApi = async (credentials) => {
  return await api.post('/auth/login', credentials);
};

export const verifyOTPApi = async (data) => {
  return await api.post('/auth/verify-otp', data);
};

export const resendOTPApi = async (data) => {
  return await api.post('/auth/resend-otp', data);
};

export const forgotPasswordApi = async (data) => {
  return await api.post('/auth/forgot-password', data);
};

export const resetPasswordApi = async (data) => {
  return await api.post('/auth/reset-password', data);
};

export const changePasswordApi = async (data) => {
  return await api.post('/auth/change-password', data);
};

export const logoutApi = async () => {
  return await api.post('/auth/logout');
};

export const getMeApi = async () => {
  return await api.get('/auth/me');
};
